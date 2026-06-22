import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../auth/password";
import { criarEmpresaNoRhally } from "../integracao/rhally.service";
import { enviarEmail } from "../mail/mail.service";
import { env } from "../config/env";

const TRIAL_DIAS = 14;

const trialSchema = z.object({
  razaoSocial: z.string().min(3, "Razão social obrigatória"),
  cnpj: z.string().min(14, "CNPJ inválido").max(18),
  nomeResponsavel: z.string().min(3, "Nome do responsável obrigatório"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  telefone: z.string().optional(),
  nomeFantasia: z.string().optional(),
});

function normalizarCnpj(cnpj: string) {
  return cnpj.replace(/\D/g, "");
}

function gerarSubdominio(razaoSocial: string, cnpjRaw: string) {
  const base = razaoSocial
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const sufixo = cnpjRaw.slice(-4);
  return `${base}-${sufixo}`;
}

/** POST /api/trial/registrar — público, sem autenticação */
export async function registrarTrial(req: Request, res: Response) {
  const parse = trialSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }

  const { razaoSocial, cnpj: cnpjRaw, nomeResponsavel, email, senha, telefone, nomeFantasia } =
    parse.data;
  const cnpj = normalizarCnpj(cnpjRaw);

  // Verificar duplicidade de e-mail
  const emailExistente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
  if (emailExistente) {
    return res.status(409).json({ error: "E-mail já cadastrado. Faça login ou recupere sua senha." });
  }

  // Verificar duplicidade de CNPJ (via empresa)
  const cnpjExistente = await prisma.empresa.findUnique({ where: { cnpj } });
  if (cnpjExistente) {
    return res.status(409).json({ error: "CNPJ já possui conta. Entre em contato com o suporte." });
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DIAS);

  const subdominio = gerarSubdominio(nomeFantasia || razaoSocial, cnpj);
  const senhaHash = await hashPassword(senha);

  // Criar tudo em transação
  const { tenant, usuario } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        nome: nomeFantasia || razaoSocial,
        subdominio,
        status: "ATIVO",
        origem: "TRIAL",
        trialEndsAt,
      },
    });

    // Buscar todos os módulos ativos — trial tem acesso a tudo
    const modulos = await tx.modulo.findMany({ where: { ativo: true } });

    await tx.tenantModulo.createMany({
      data: modulos.map((m) => ({ tenantId: tenant.id, moduloId: m.id, ativo: true })),
      skipDuplicates: true,
    });

    const empresa = await tx.empresa.create({
      data: {
        tenantId: tenant.id,
        razaoSocial,
        nomeFantasia: nomeFantasia || null,
        cnpj,
      },
    });

    const usuario = await tx.usuario.create({
      data: {
        tenantId: tenant.id,
        nome: nomeResponsavel,
        email: email.toLowerCase(),
        senhaHash,
        telefone: telefone || null,
        isMaster: true,
        ativo: true,
        usuarioEmpresas: { create: { empresaId: empresa.id } },
      },
    });

    return { tenant, usuario };
  });

  // Criar empresa no Rhally (não bloqueia o cadastro se falhar)
  try {
    await criarEmpresaNoRhally({
      razao_social: razaoSocial,
      cnpj,
      nome_fantasia: nomeFantasia,
      telephone: telefone,
      email: email.toLowerCase(),
      admins: [{ nome: nomeResponsavel, email: email.toLowerCase() }],
    });
  } catch (err) {
    console.error("[trial] Falha ao criar empresa no Rhally:", (err as Error).message);
  }

  const loginUrl = `https://plataforma.rhally.com.br`;
  const trialEndStr = trialEndsAt.toLocaleDateString("pt-BR");

  // E-mail de boas-vindas ao cliente (com credenciais completas)
  const emailCliente = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0ff;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.10);">
      <!-- Header -->
      <tr><td style="background:#7c3aed;padding:36px 40px;text-align:center;">
        <p style="margin:0;font-size:38px;font-weight:900;color:#fff;letter-spacing:-1px;">rhally</p>
        <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);letter-spacing:2px;">O CÉREBRO DO RH</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:40px 40px 32px;">
        <h1 style="margin:0 0 8px;font-size:26px;color:#1a1a2e;">Bem-vindo(a) à Rhally, ${nomeResponsavel}! 🎉</h1>
        <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Seu teste gratuito de <strong>${TRIAL_DIAS} dias</strong> foi ativado com sucesso.<br>
          Você tem acesso completo a <strong>todos os módulos</strong> da plataforma.
        </p>

        <!-- Caixa de credenciais -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ff;border:1px solid #e9d5ff;border-radius:12px;margin-bottom:28px;">
          <tr><td style="padding:24px 28px;">
            <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Seus dados de acesso</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:5px 16px 5px 0;font-size:13px;color:#888;white-space:nowrap;">Plataforma</td>
                <td style="padding:5px 0;font-size:13px;color:#1a1a2e;font-weight:600;">${loginUrl}</td>
              </tr>
              <tr>
                <td style="padding:5px 16px 5px 0;font-size:13px;color:#888;white-space:nowrap;">E-mail</td>
                <td style="padding:5px 0;font-size:13px;color:#1a1a2e;font-weight:600;">${email}</td>
              </tr>
              <tr>
                <td style="padding:5px 16px 5px 0;font-size:13px;color:#888;white-space:nowrap;">Senha</td>
                <td style="padding:5px 0;font-size:13px;color:#1a1a2e;font-weight:600;">${senha}</td>
              </tr>
              <tr>
                <td style="padding:5px 16px 5px 0;font-size:13px;color:#888;white-space:nowrap;">Trial válido até</td>
                <td style="padding:5px 0;font-size:13px;color:#7c3aed;font-weight:700;">${trialEndStr}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding-bottom:28px;">
            <a href="${loginUrl}" style="display:inline-block;padding:14px 40px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
              Acessar a Rhally agora →
            </a>
          </td></tr>
        </table>

        <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 8px;">
          <strong>Módulos liberados:</strong> Ponto Eletrônico, Admissão Digital, Benefícios, Talent (Recrutamento), NR-1, One-on-Ones, Holerites, Documentos, EPI, Dashboard e muito mais.
        </p>
        <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
          Dúvidas? Fale com nosso time pelo WhatsApp ou responda este e-mail.
        </p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f8f4ff;padding:20px 40px;text-align:center;border-top:1px solid #e9d5ff;">
        <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} Rhally Tecnologia — O cérebro do RH</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  try {
    await enviarEmail(email, `✅ Seu acesso Rhally está pronto — ${trialEndStr}`, emailCliente);
  } catch (err) {
    console.error("[trial] Falha ao enviar e-mail ao cliente:", (err as Error).message);
  }

  // E-mail de notificação para a equipe Rhally
  const emailEquipe = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f3f0ff;margin:0;padding:20px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border-left:5px solid #7c3aed;">
  <h2 style="color:#7c3aed;margin:0 0 16px;">🆕 Novo Trial Cadastrado</h2>
  <table cellpadding="0" cellspacing="0">
    <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px;">Empresa</td><td style="color:#1a1a2e;font-size:13px;font-weight:600;">${razaoSocial}${nomeFantasia ? ` (${nomeFantasia})` : ""}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px;">CNPJ</td><td style="color:#1a1a2e;font-size:13px;">${cnpj}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px;">Responsável</td><td style="color:#1a1a2e;font-size:13px;">${nomeResponsavel}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px;">E-mail</td><td style="color:#1a1a2e;font-size:13px;">${email}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px;">Telefone</td><td style="color:#1a1a2e;font-size:13px;">${telefone || "—"}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px;">Trial expira</td><td style="color:#7c3aed;font-size:13px;font-weight:700;">${trialEndStr}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px;">Cadastrado em</td><td style="color:#1a1a2e;font-size:13px;">${new Date().toLocaleString("pt-BR")}</td></tr>
  </table>
</div>
</body></html>`;

  try {
    await enviarEmail("comercial@rhally.com.br", `🆕 Novo trial: ${razaoSocial}`, emailEquipe);
  } catch (err) {
    console.error("[trial] Falha ao notificar equipe:", (err as Error).message);
  }

  return res.status(201).json({
    message: "Trial ativado com sucesso!",
    trial: {
      tenantNome: tenant.nome,
      subdominio: tenant.subdominio,
      endsAt: trialEndsAt,
    },
  });
}
