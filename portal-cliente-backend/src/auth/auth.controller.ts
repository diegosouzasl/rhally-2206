import { Request, Response } from "express";
import { z } from "zod";
import { authenticator } from "otplib";
import { prisma } from "../lib/prisma";
import { comparePassword } from "./password";
import { signPortalToken } from "./jwt";
import { criarSessao } from "./sessions.service";
import { registrarLog } from "../auditoria/auditoria.service";
import { registrarEvento } from "../historico/historico.service";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Senha obrigatória"),
  codigo2fa: z.string().optional(),
});

/** POST /api/auth/login → autentica usuário e devolve o JWT. */
export async function login(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  const { email, senha, codigo2fa } = parse.data;

  const usuario = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { tenant: { select: { status: true, nome: true, origem: true, trialEndsAt: true } } },
  });

  // Mensagem genérica para não revelar se o e-mail existe.
  if (!usuario || !usuario.ativo || !usuario.senhaHash) {
    return res.status(401).json({ error: "Credenciais inválidas." });
  }

  const ok = await comparePassword(senha, usuario.senhaHash);
  if (!ok) {
    return res.status(401).json({ error: "Credenciais inválidas." });
  }

  if (usuario.tenant.status !== "ATIVO") {
    return res.status(403).json({ error: "Conta inativa ou suspensa." });
  }

  // Trial expirado: bloqueia o login
  if (usuario.tenant.trialEndsAt && new Date() > usuario.tenant.trialEndsAt) {
    return res.status(403).json({
      error: "trial_expired",
      message: "Seu período de teste encerrou. Entre em contato com o comercial Rhally para contratar.",
    });
  }

  // 2FA: se ativo, exige o código TOTP.
  if (usuario.twoFactorEnabled && usuario.twoFactorSecret) {
    if (!codigo2fa) {
      return res.status(401).json({ error: "2fa_required", message: "Informe o código de autenticação." });
    }
    if (!authenticator.verify({ token: codigo2fa, secret: usuario.twoFactorSecret })) {
      return res.status(401).json({ error: "Código de autenticação incorreto." });
    }
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoLogin: new Date() },
  });

  const jti = await criarSessao(usuario.id, req);
  const token = signPortalToken({
    sub: usuario.id,
    tenantId: usuario.tenantId,
    email: usuario.email,
    nome: usuario.nome,
    jti,
    trialEndsAt: usuario.tenant.trialEndsAt?.toISOString() ?? null,
  });

  await registrarLog({
    tenantId: usuario.tenantId,
    usuarioId: usuario.id,
    acao: "login",
    modulo: "auth",
    req,
  });

  if (usuario.cpf) {
    await registrarEvento({
      tenantId: usuario.tenantId,
      cpf: usuario.cpf,
      usuarioId: usuario.id,
      tipo: "login",
      titulo: "Acesso ao sistema",
      origem: "portal",
    });
  }

  return res.json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tenant: { nome: usuario.tenant.nome },
    },
  });
}

/** GET /api/auth/me → dados do usuário autenticado. */
export async function me(req: Request, res: Response) {
  const u = req.usuario!;
  const usuario = await prisma.usuario.findUnique({
    where: { id: u.sub },
    select: {
      id: true, nome: true, email: true, cargo: true, cpf: true,
      tenant: { select: { id: true, nome: true, status: true } },
      usuarioEmpresas: {
        select: { empresa: { select: { id: true, razaoSocial: true, cnpj: true } } },
      },
    },
  });
  if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

  return res.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    cargo: usuario.cargo,
    cpf: usuario.cpf,
    tenant: usuario.tenant,
    empresas: usuario.usuarioEmpresas.map((ue) => ue.empresa),
  });
}
