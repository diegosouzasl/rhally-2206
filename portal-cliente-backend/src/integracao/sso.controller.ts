import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { gerarPortalToken } from "./rhally.service";
import { usuarioEhAdmin } from "../rbac/permissions.service";

/**
 * POST /api/sso/rhally  (autenticado)
 * Gera um portal_token (handoff) para o usuário logado entrar no Rhally.
 * O frontend então envia esse token para POST {RHALLY}/sso/portal-handoff.
 */
export async function iniciarSsoRhally(req: Request, res: Response) {
  const u = req.usuario!;

  const usuario = await prisma.usuario.findUnique({
    where: { id: u.sub },
    select: { email: true, nome: true, ativo: true },
  });
  if (!usuario || !usuario.ativo) {
    return res.status(403).json({ error: "Usuário inativo." });
  }

  const isAdmin = await usuarioEhAdmin(u.sub);

  const portalToken = gerarPortalToken({
    email: usuario.email,
    nome: usuario.nome,
    isAdmin,
  });

  return res.json({
    portal_token: portalToken,
    handoff_url: `${env.rhallyApiUrl}/sso/portal-handoff`,
  });
}
