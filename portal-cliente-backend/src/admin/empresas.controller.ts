import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { onlyDigits } from "../modules/modules.service";
import { registrarLog } from "../auditoria/auditoria.service";

export async function listar(req: Request, res: Response) {
  const empresas = await prisma.empresa.findMany({
    where: { tenantId: req.usuario!.tenantId },
    orderBy: { razaoSocial: "asc" },
  });
  return res.json(empresas);
}

const schema = z.object({
  razaoSocial: z.string().min(2),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().min(14),
  inscEstadual: z.string().optional(),
  regimeTributario: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
});

export async function criar(req: Request, res: Response) {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  const cnpj = onlyDigits(parse.data.cnpj);
  if (cnpj.length !== 14) return res.status(400).json({ error: "CNPJ deve ter 14 dígitos." });

  const existe = await prisma.empresa.findUnique({ where: { cnpj } });
  if (existe) return res.status(409).json({ error: "Já existe empresa com este CNPJ." });

  const empresa = await prisma.empresa.create({
    data: { ...parse.data, cnpj, tenantId: req.usuario!.tenantId },
  });
  await registrarLog({
    tenantId: req.usuario!.tenantId, usuarioId: req.usuario!.sub,
    acao: "criar", modulo: "empresas", entidade: "empresa", entidadeId: empresa.id, req,
  });
  return res.status(201).json(empresa);
}

export async function atualizar(req: Request, res: Response) {
  const parse = schema.partial().safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  const id = Number(req.params.id);
  const empresa = await prisma.empresa.findFirst({ where: { id, tenantId: req.usuario!.tenantId } });
  if (!empresa) return res.status(404).json({ error: "Empresa não encontrada." });

  const data = { ...parse.data };
  if (data.cnpj) data.cnpj = onlyDigits(data.cnpj);
  const atual = await prisma.empresa.update({ where: { id }, data });
  await registrarLog({
    tenantId: req.usuario!.tenantId, usuarioId: req.usuario!.sub,
    acao: "editar", modulo: "empresas", entidade: "empresa", entidadeId: id, req,
  });
  return res.json(atual);
}
