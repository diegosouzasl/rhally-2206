import { Request } from "express";
import { prisma } from "../lib/prisma";

type LogInput = {
  tenantId: number;
  usuarioId?: number | null;
  acao: string;
  modulo?: string;
  entidade?: string;
  entidadeId?: string | number;
  detalhes?: unknown;
  req?: Request;
};

/** Registra uma ação no log de auditoria (não lança erro para não quebrar o fluxo). */
export async function registrarLog(input: LogInput): Promise<void> {
  try {
    await prisma.logAuditoria.create({
      data: {
        tenantId: input.tenantId,
        usuarioId: input.usuarioId ?? null,
        acao: input.acao,
        modulo: input.modulo,
        entidade: input.entidade,
        entidadeId: input.entidadeId != null ? String(input.entidadeId) : undefined,
        detalhes: input.detalhes ? JSON.stringify(input.detalhes) : undefined,
        ip: input.req?.ip,
        userAgent: input.req?.headers["user-agent"]?.slice(0, 255),
      },
    });
  } catch (e) {
    console.error("[auditoria] falha ao registrar log:", e);
  }
}

/** Lista logs do tenant (com filtros simples e paginação). */
export async function listarLogs(params: {
  tenantId: number;
  usuarioId?: number;
  modulo?: string;
  limit?: number;
  offset?: number;
}) {
  const { tenantId, usuarioId, modulo, limit = 50, offset = 0 } = params;
  return prisma.logAuditoria.findMany({
    where: { tenantId, usuarioId, modulo },
    orderBy: { criadoEm: "desc" },
    take: Math.min(limit, 200),
    skip: offset,
    include: { usuario: { select: { nome: true, email: true } } },
  });
}
