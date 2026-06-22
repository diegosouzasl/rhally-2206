import { Request, Response } from "express";
import { z } from "zod";
import {
  criarSolicitacao,
  listarSolicitacoes,
  obterSolicitacao,
  responder,
  mudarStatus,
} from "./solicitacoes.service";
import { registrarLog } from "../auditoria/auditoria.service";
import { registrarEvento } from "../historico/historico.service";
import { prisma } from "../lib/prisma";

const criarSchema = z.object({
  tipo: z.enum(["SUPORTE_RHALLY", "INTERNA", "TICKET"]),
  titulo: z.string().min(3).max(180),
  descricao: z.string().min(3),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  empresaId: z.number().int().positive().optional(),
});

/** POST /api/solicitacoes — qualquer usuário autenticado pode abrir (master sempre). */
export async function criar(req: Request, res: Response) {
  const parse = criarSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  const s = await criarSolicitacao({
    tenantId: req.usuario!.tenantId,
    criadorId: req.usuario!.sub,
    ...parse.data,
  });
  await registrarLog({
    tenantId: req.usuario!.tenantId, usuarioId: req.usuario!.sub,
    acao: "criar", modulo: "solicitacoes", entidade: "solicitacao", entidadeId: s.id, req,
  });
  const criador = await prisma.usuario.findUnique({ where: { id: req.usuario!.sub }, select: { cpf: true } });
  if (criador?.cpf) {
    await registrarEvento({
      tenantId: req.usuario!.tenantId,
      cpf: criador.cpf,
      usuarioId: req.usuario!.sub,
      tipo: "solicitacao",
      titulo: `Solicitação aberta: ${s.titulo}`,
      descricao: parse.data.descricao,
      origem: "portal",
      metadata: { tipo: s.tipo, prioridade: s.prioridade, solicitacaoId: s.id },
    });
  }
  return res.status(201).json(s);
}

/** GET /api/solicitacoes — lista do tenant (filtros opcionais). */
export async function listar(req: Request, res: Response) {
  const { tipo, status, minhas } = req.query;
  const lista = await listarSolicitacoes({
    tenantId: req.usuario!.tenantId,
    tipo: tipo as never,
    status: status as never,
    criadorId: minhas === "true" ? req.usuario!.sub : undefined,
  });
  return res.json(lista);
}

/** GET /api/solicitacoes/:id — detalhe + thread. */
export async function detalhe(req: Request, res: Response) {
  const s = await obterSolicitacao(req.usuario!.tenantId, Number(req.params.id));
  if (!s) return res.status(404).json({ error: "Solicitação não encontrada." });
  return res.json(s);
}

const respSchema = z.object({ mensagem: z.string().min(1), interno: z.boolean().optional() });

/** POST /api/solicitacoes/:id/responder — adiciona mensagem na thread. */
export async function adicionarResposta(req: Request, res: Response) {
  const parse = respSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Mensagem obrigatória." });
  const s = await obterSolicitacao(req.usuario!.tenantId, Number(req.params.id));
  if (!s) return res.status(404).json({ error: "Solicitação não encontrada." });
  const msg = await responder({
    solicitacaoId: s.id, autorId: req.usuario!.sub, ...parse.data,
  });
  return res.status(201).json(msg);
}

const statusSchema = z.object({
  status: z.enum(["ABERTA", "EM_ANDAMENTO", "AGUARDANDO", "RESOLVIDA", "FECHADA", "APROVADA", "REJEITADA"]),
});

/** PATCH /api/solicitacoes/:id/status — muda status (inclui aprovar/rejeitar). */
export async function alterarStatus(req: Request, res: Response) {
  const parse = statusSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Status inválido." });
  await mudarStatus(req.usuario!.tenantId, Number(req.params.id), parse.data.status, req.usuario!.sub);
  await registrarLog({
    tenantId: req.usuario!.tenantId, usuarioId: req.usuario!.sub,
    acao: "mudar_status", modulo: "solicitacoes", entidade: "solicitacao",
    entidadeId: req.params.id, detalhes: { status: parse.data.status }, req,
  });
  return res.json({ ok: true });
}
