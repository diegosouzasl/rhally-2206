import { prisma } from "../lib/prisma";

type Tipo = "SUPORTE_RHALLY" | "INTERNA" | "TICKET";
type Prioridade = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
type Status = "ABERTA" | "EM_ANDAMENTO" | "AGUARDANDO" | "RESOLVIDA" | "FECHADA" | "APROVADA" | "REJEITADA";

export function criarSolicitacao(input: {
  tenantId: number;
  criadorId: number;
  empresaId?: number;
  tipo: Tipo;
  titulo: string;
  descricao: string;
  prioridade?: Prioridade;
}) {
  return prisma.solicitacao.create({
    data: {
      tenantId: input.tenantId,
      criadorId: input.criadorId,
      empresaId: input.empresaId,
      tipo: input.tipo,
      titulo: input.titulo,
      descricao: input.descricao,
      prioridade: input.prioridade || "MEDIA",
    },
  });
}

export function listarSolicitacoes(params: {
  tenantId: number;
  tipo?: Tipo;
  status?: Status;
  criadorId?: number;
}) {
  return prisma.solicitacao.findMany({
    where: {
      tenantId: params.tenantId,
      tipo: params.tipo,
      status: params.status,
      criadorId: params.criadorId,
    },
    orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
    include: {
      criador: { select: { id: true, nome: true } },
      _count: { select: { mensagens: true } },
    },
  });
}

export function obterSolicitacao(tenantId: number, id: number) {
  return prisma.solicitacao.findFirst({
    where: { id, tenantId },
    include: {
      criador: { select: { id: true, nome: true, email: true } },
      aprovador: { select: { id: true, nome: true } },
      mensagens: {
        orderBy: { criadoEm: "asc" },
        include: { autor: { select: { id: true, nome: true } } },
      },
    },
  });
}

export function responder(input: {
  solicitacaoId: number;
  autorId: number;
  mensagem: string;
  interno?: boolean;
}) {
  return prisma.solicitacaoMensagem.create({
    data: {
      solicitacaoId: input.solicitacaoId,
      autorId: input.autorId,
      mensagem: input.mensagem,
      interno: input.interno ?? false,
    },
  });
}

export function mudarStatus(tenantId: number, id: number, status: Status, aprovadorId?: number) {
  return prisma.solicitacao.updateMany({
    where: { id, tenantId },
    data: {
      status,
      aprovadorId: (status === "APROVADA" || status === "REJEITADA") ? aprovadorId : undefined,
    },
  });
}
