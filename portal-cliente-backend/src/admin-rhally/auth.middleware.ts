import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

export async function autenticarAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Token ausente." });

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.portalJwtSecret) as any;
    if (payload.tipo !== "admin") return res.status(401).json({ error: "Token inválido." });

    const admin = await prisma.adminUsuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });
    if (!admin || !admin.ativo) return res.status(401).json({ error: "Acesso negado." });

    (req as any).adminUsuario = admin;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

export function exigirRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = (req as any).adminUsuario;
    if (!roles.includes(admin?.role)) return res.status(403).json({ error: "Permissão insuficiente." });
    next();
  };
}
