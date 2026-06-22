import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { signPortalToken } from "./jwt";
import { criarSessao } from "./sessions.service";
import { registrarLog } from "../auditoria/auditoria.service";

const client = new OAuth2Client(env.googleClientId);

/**
 * POST /api/auth/google — login social.
 * Recebe { idToken } do Google Sign-In, valida e autentica o usuário
 * cujo e-mail já exista na plataforma (vincula googleId no primeiro uso).
 */
export async function loginGoogle(req: Request, res: Response) {
  if (!env.googleClientId) {
    return res.status(500).json({ error: "Login Google não configurado (GOOGLE_CLIENT_ID)." });
  }
  const idToken = req.body?.idToken as string | undefined;
  if (!idToken) return res.status(400).json({ error: "idToken é obrigatório." });

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Token do Google inválido." });
  }
  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ error: "Conta Google sem e-mail verificado." });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: payload.email.toLowerCase() },
    include: { tenant: { select: { status: true, nome: true } } },
  });
  if (!usuario || !usuario.ativo) {
    return res.status(403).json({ error: "Nenhum usuário ativo com este e-mail." });
  }
  if (usuario.tenant.status !== "ATIVO") {
    return res.status(403).json({ error: "Conta inativa ou suspensa." });
  }

  // vincula o googleId no primeiro login social
  if (!usuario.googleId && payload.sub) {
    await prisma.usuario.update({ where: { id: usuario.id }, data: { googleId: payload.sub } });
  }

  const jti = await criarSessao(usuario.id, req);
  const token = signPortalToken({
    sub: usuario.id,
    tenantId: usuario.tenantId,
    email: usuario.email,
    nome: usuario.nome,
    jti,
  });

  await registrarLog({ tenantId: usuario.tenantId, usuarioId: usuario.id, acao: "login_google", modulo: "auth", req });

  return res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tenant: { nome: usuario.tenant.nome } },
  });
}
