import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

/**
 * Autentica chamadas de SERVIÇO de outros sistemas (ex.: o app Rhally enviando
 * eventos de histórico). Espera Bearer JWT assinado com RHALLY_JWT_PASS e
 * sourceSystem em ["rhally", "portal-cliente"]. O tenantId vem no payload.
 */
export function autenticarServico(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const [scheme, token] = (header || "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ error: "Token de serviço ausente." });
  }
  try {
    const payload = jwt.verify(token, env.rhallyJwtPass) as { sourceSystem?: string; tenantId?: number };
    if (!payload.sourceSystem || !["rhally", "portal-cliente"].includes(payload.sourceSystem)) {
      return res.status(403).json({ error: "Origem de serviço não permitida." });
    }
    (req as Request & { servico?: { tenantId?: number } }).servico = { tenantId: payload.tenantId };
    return next();
  } catch {
    return res.status(401).json({ error: "Token de serviço inválido." });
  }
}
