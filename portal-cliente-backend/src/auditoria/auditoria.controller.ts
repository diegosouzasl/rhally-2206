import { Request, Response } from "express";
import { listarLogs } from "./auditoria.service";

/** GET /api/auditoria — lista logs do tenant do usuário (permissão auditoria:VISUALIZAR). */
export async function listar(req: Request, res: Response) {
  const tenantId = req.usuario!.tenantId;
  const { usuarioId, modulo, limit, offset } = req.query;
  const logs = await listarLogs({
    tenantId,
    usuarioId: usuarioId ? Number(usuarioId) : undefined,
    modulo: modulo ? String(modulo) : undefined,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  return res.json(logs);
}
