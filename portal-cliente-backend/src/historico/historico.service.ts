import { prisma } from "../lib/prisma";
import { onlyDigits } from "../modules/modules.service";

export type EventoInput = {
  tenantId: number;
  cpf: string;
  usuarioId?: number | null;
  tipo: string;
  titulo: string;
  descricao?: string;
  valor?: number;
  origem?: string;
  metadata?: unknown;
  dataEvento?: Date;
};

/** Registra um evento na linha do tempo da pessoa (não lança erro). */
export async function registrarEvento(input: EventoInput): Promise<void> {
  const cpf = onlyDigits(input.cpf);
  if (!cpf) return;
  try {
    await prisma.eventoHistorico.create({
      data: {
        tenantId: input.tenantId,
        cpf,
        usuarioId: input.usuarioId ?? null,
        tipo: input.tipo,
        titulo: input.titulo,
        descricao: input.descricao,
        valor: input.valor != null ? input.valor : undefined,
        origem: input.origem || "portal",
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
        dataEvento: input.dataEvento || new Date(),
      },
    });
  } catch (e) {
    console.error("[historico] falha ao registrar evento:", e);
  }
}

/** Linha do tempo de uma pessoa (por CPF), com filtros. */
export async function listarHistorico(params: {
  tenantId: number;
  cpf: string;
  tipo?: string;
  de?: Date;
  ate?: Date;
  limit?: number;
  offset?: number;
}) {
  const cpf = onlyDigits(params.cpf);
  const where = {
    tenantId: params.tenantId,
    cpf,
    tipo: params.tipo,
    dataEvento: (params.de || params.ate) ? { gte: params.de, lte: params.ate } : undefined,
  };
  const [eventos, total] = await Promise.all([
    prisma.eventoHistorico.findMany({
      where,
      orderBy: { dataEvento: "desc" },
      take: Math.min(params.limit ?? 100, 500),
      skip: params.offset ?? 0,
    }),
    prisma.eventoHistorico.count({ where }),
  ]);
  return { total, eventos };
}

/** Resumo da pessoa: contagem por tipo e total recebido. */
export async function resumoPessoa(tenantId: number, cpfRaw: string) {
  const cpf = onlyDigits(cpfRaw);
  const porTipo = await prisma.eventoHistorico.groupBy({
    by: ["tipo"],
    where: { tenantId, cpf },
    _count: { _all: true },
    _sum: { valor: true },
  });
  const totalRecebido = porTipo.reduce((acc, t) => acc + Number(t._sum.valor || 0), 0);
  return {
    cpf,
    totalEventos: porTipo.reduce((acc, t) => acc + t._count._all, 0),
    totalRecebido,
    porTipo: porTipo.map((t) => ({ tipo: t.tipo, quantidade: t._count._all, soma: Number(t._sum.valor || 0) })),
  };
}
