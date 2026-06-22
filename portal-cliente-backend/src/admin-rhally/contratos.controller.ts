import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const contratoSchema = z.object({
  planoId: z.number(),
  dataInicio: z.string(),
  dataFim: z.string().optional().nullable(),
  valorMensal: z.number().positive(),
  diaVencimento: z.number().min(1).max(28).default(10),
  status: z.enum(["ATIVO", "ENCERRADO", "SUSPENSO"]).optional(),
  urlContratoPdf: z.string().url().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export async function listar(req: Request, res: Response) {
  const tenantId = Number(req.params.id);
  const contratos = await prisma.contrato.findMany({
    where: { tenantId },
    include: { plano: { select: { nome: true } } },
    orderBy: { criadoEm: "desc" },
  });
  return res.json(contratos);
}

export async function criar(req: Request, res: Response) {
  const tenantId = Number(req.params.id);
  const parse = contratoSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Dados inválidos.", details: parse.error.flatten() });

  const { planoId, dataInicio, dataFim, valorMensal, diaVencimento, status, urlContratoPdf, observacoes } = parse.data;

  const contrato = await prisma.contrato.create({
    data: {
      tenantId,
      planoId,
      dataInicio: new Date(dataInicio),
      dataFim: dataFim ? new Date(dataFim) : null,
      valorMensal,
      diaVencimento,
      status: status ?? "ATIVO",
      urlContratoPdf: urlContratoPdf ?? null,
      observacoes: observacoes ?? null,
    },
    include: { plano: { select: { nome: true } } },
  });

  // Converter trial para CONTRATO
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { origem: "CONTRATO", trialEndsAt: null },
  });

  return res.status(201).json(contrato);
}

export async function atualizar(req: Request, res: Response) {
  const id = Number(req.params.contratoId);
  const { valorMensal, diaVencimento, status, dataFim, urlContratoPdf, observacoes } = req.body;

  const data: any = {};
  if (valorMensal !== undefined) data.valorMensal = valorMensal;
  if (diaVencimento !== undefined) data.diaVencimento = diaVencimento;
  if (status) data.status = status;
  if (dataFim !== undefined) data.dataFim = dataFim ? new Date(dataFim) : null;
  if (urlContratoPdf !== undefined) data.urlContratoPdf = urlContratoPdf;
  if (observacoes !== undefined) data.observacoes = observacoes;

  const contrato = await prisma.contrato.update({
    where: { id },
    data,
    include: { plano: { select: { nome: true } } },
  });
  return res.json(contrato);
}

export async function listarPlanos(_req: Request, res: Response) {
  const planos = await prisma.plano.findMany({ where: { ativo: true }, orderBy: { precoMensal: "asc" } });
  return res.json(planos);
}
