import { Request, Response } from "express";
import { z } from "zod";
import { registrarEvento, listarHistorico, resumoPessoa } from "./historico.service";

/** GET /api/historico/:cpf — linha do tempo da pessoa (filtros: tipo, de, ate). */
export async function timeline(req: Request, res: Response) {
  const { tipo, de, ate, limit, offset } = req.query;
  const data = await listarHistorico({
    tenantId: req.usuario!.tenantId,
    cpf: req.params.cpf,
    tipo: tipo ? String(tipo) : undefined,
    de: de ? new Date(String(de)) : undefined,
    ate: ate ? new Date(String(ate)) : undefined,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  return res.json(data);
}

/** GET /api/historico/:cpf/resumo — totais por tipo + total recebido. */
export async function resumo(req: Request, res: Response) {
  const data = await resumoPessoa(req.usuario!.tenantId, req.params.cpf);
  return res.json(data);
}

const eventoSchema = z.object({
  cpf: z.string().min(11),
  tipo: z.string().min(2),
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  valor: z.number().optional(),
  origem: z.string().optional(),
  metadata: z.unknown().optional(),
  dataEvento: z.string().optional(), // ISO
  usuarioId: z.number().int().optional(),
});
const ingestSchema = z.union([eventoSchema, z.array(eventoSchema)]);

/**
 * POST /api/historico/eventos — ingestão de eventos (autenticação de serviço).
 * Aceita um evento ou uma lista. O tenantId vem do token de serviço.
 */
export async function ingerir(req: Request, res: Response) {
  const servico = (req as Request & { servico?: { tenantId?: number } }).servico;
  const tenantId = servico?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: "tenantId ausente no token de serviço." });
  }
  const parse = ingestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  const eventos = Array.isArray(parse.data) ? parse.data : [parse.data];
  for (const e of eventos) {
    await registrarEvento({
      tenantId,
      cpf: e.cpf,
      usuarioId: e.usuarioId ?? null,
      tipo: e.tipo,
      titulo: e.titulo,
      descricao: e.descricao,
      valor: e.valor,
      origem: e.origem || "rhally",
      metadata: e.metadata,
      dataEvento: e.dataEvento ? new Date(e.dataEvento) : undefined,
    });
  }
  return res.status(201).json({ ok: true, recebidos: eventos.length });
}
