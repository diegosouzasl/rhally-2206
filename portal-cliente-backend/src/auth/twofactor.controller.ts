import { Request, Response } from "express";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "../lib/prisma";

/**
 * POST /api/2fa/setup — gera um segredo TOTP e o QR code para o usuário
 * cadastrar no app autenticador. Só ativa de fato após /2fa/enable.
 */
export async function setup(req: Request, res: Response) {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.sub } });
  if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(usuario.email, "Rhally", secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  // guarda o segredo (ainda não habilitado)
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  return res.json({ secret, otpauth, qrDataUrl });
}

const codigoSchema = z.object({ codigo: z.string().min(6).max(6) });

/** POST /api/2fa/enable — confirma o código e ativa o 2FA. */
export async function enable(req: Request, res: Response) {
  const parse = codigoSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Código inválido." });

  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.sub } });
  if (!usuario?.twoFactorSecret) {
    return res.status(400).json({ error: "Inicie o cadastro do 2FA primeiro (/2fa/setup)." });
  }

  const ok = authenticator.verify({ token: parse.data.codigo, secret: usuario.twoFactorSecret });
  if (!ok) return res.status(400).json({ error: "Código incorreto." });

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { twoFactorEnabled: true },
  });
  return res.json({ ok: true, twoFactorEnabled: true });
}

/** POST /api/2fa/disable — desativa o 2FA (exige código atual). */
export async function disable(req: Request, res: Response) {
  const parse = codigoSchema.safeParse(req.body);
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.sub } });
  if (!usuario?.twoFactorEnabled || !usuario.twoFactorSecret) {
    return res.status(400).json({ error: "2FA não está ativo." });
  }
  if (!parse.success || !authenticator.verify({ token: parse.data.codigo, secret: usuario.twoFactorSecret })) {
    return res.status(400).json({ error: "Código incorreto." });
  }
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  return res.json({ ok: true, twoFactorEnabled: false });
}
