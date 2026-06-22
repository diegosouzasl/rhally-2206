import { Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { hashPassword } from "./password";
import { enviarEmail } from "../mail/mail.service";
import { revogarTodas } from "./sessions.service";

function hashToken(t: string) {
  return crypto.createHash("sha256").update(t).digest("hex");
}

const solicitarSchema = z.object({ email: z.string().email() });

/** POST /api/auth/recuperar — gera token e envia link por e-mail. */
export async function solicitar(req: Request, res: Response) {
  const parse = solicitarSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "E-mail inválido." });

  const usuario = await prisma.usuario.findUnique({ where: { email: parse.data.email.toLowerCase().trim() } });

  // Sempre responde ok (não revela se o e-mail existe).
  if (usuario && usuario.ativo) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.recuperacaoSenha.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashToken(token),
        expiraEm: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });
    const link = `${env.appUrl}/redefinir-senha?token=${token}`;
    await enviarEmail(
      usuario.email,
      "Recuperação de senha · Rhally",
      `<p>Olá, ${usuario.nome}.</p><p>Para redefinir sua senha, clique no link (válido por 1 hora):</p><p><a href="${link}">${link}</a></p>`
    );
  }

  return res.json({ ok: true, message: "Se o e-mail existir, enviaremos as instruções." });
}

const redefinirSchema = z.object({
  token: z.string().min(10),
  novaSenha: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
});

/** POST /api/auth/redefinir — troca a senha usando o token. */
export async function redefinir(req: Request, res: Response) {
  const parse = redefinirSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }

  const rec = await prisma.recuperacaoSenha.findUnique({
    where: { tokenHash: hashToken(parse.data.token) },
  });
  if (!rec || rec.usado || rec.expiraEm.getTime() < Date.now()) {
    return res.status(400).json({ error: "Token inválido ou expirado." });
  }

  const senhaHash = await hashPassword(parse.data.novaSenha);
  await prisma.usuario.update({ where: { id: rec.usuarioId }, data: { senhaHash } });
  await prisma.recuperacaoSenha.update({ where: { id: rec.id }, data: { usado: true } });

  // Segurança: encerra todas as sessões ativas após troca de senha.
  await revogarTodas(rec.usuarioId);

  return res.json({ ok: true });
}
