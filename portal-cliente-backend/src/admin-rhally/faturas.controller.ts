import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const gerarSchema = z.object({
  contratoId: z.number(),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, "Formato: YYYY-MM"),
  vencimento: z.string(),
  valor: z.number().positive().optional(),
});

export async function listar(req: Request, res: Response) {
  const tenantId = Number(req.params.id);
  const faturas = await prisma.fatura.findMany({
    where: { tenantId },
    include: { contrato: { include: { plano: { select: { nome: true } } } } },
    orderBy: { vencimento: "desc" },
  });
  return res.json(faturas);
}

export async function gerar(req: Request, res: Response) {
  const tenantId = Number(req.params.id);
  const parse = gerarSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Dados inválidos.", details: parse.error.flatten() });

  const { contratoId, competencia, vencimento, valor } = parse.data;

  const contrato = await prisma.contrato.findFirst({ where: { id: contratoId, tenantId } });
  if (!contrato) return res.status(404).json({ error: "Contrato não encontrado." });

  const jaExiste = await prisma.fatura.findUnique({ where: { contratoId_competencia: { contratoId, competencia } } });
  if (jaExiste) return res.status(409).json({ error: "Fatura já gerada para esta competência." });

  const fatura = await prisma.fatura.create({
    data: {
      contratoId,
      tenantId,
      competencia,
      valor: valor ?? contrato.valorMensal,
      vencimento: new Date(vencimento),
      status: "PENDENTE",
    },
  });
  return res.status(201).json(fatura);
}

export async function atualizarStatus(req: Request, res: Response) {
  const faturaId = Number(req.params.faturaId);
  const { status, pagoEm } = req.body;

  const fatura = await prisma.fatura.update({
    where: { id: faturaId },
    data: {
      status,
      pagoEm: pagoEm ? new Date(pagoEm) : status === "PAGA" ? new Date() : undefined,
    },
  });
  return res.json(fatura);
}

export async function resumoFinanceiro(req: Request, res: Response) {
  const tenantId = Number(req.params.id);
  const [pendentes, pagas, atrasadas] = await Promise.all([
    prisma.fatura.aggregate({ where: { tenantId, status: "PENDENTE" }, _sum: { valor: true }, _count: true }),
    prisma.fatura.aggregate({ where: { tenantId, status: "PAGA" }, _sum: { valor: true }, _count: true }),
    prisma.fatura.aggregate({ where: { tenantId, status: "ATRASADA" }, _sum: { valor: true }, _count: true }),
  ]);
  return res.json({ pendentes, pagas, atrasadas });
}
