import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function listar(req: Request, res: Response) {
  const { busca, status, origem } = req.query as any;

  const where: any = {};
  if (status) where.status = status;
  if (origem) where.origem = origem;
  if (busca) {
    where.OR = [
      { nome: { contains: busca } },
      { empresas: { some: { razaoSocial: { contains: busca } } } },
      { empresas: { some: { cnpj: { contains: busca } } } },
    ];
  }

  const tenants = await prisma.tenant.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    include: {
      empresas: { select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true } },
      contratos: {
        where: { status: "ATIVO" },
        include: { plano: { select: { nome: true } } },
        take: 1,
        orderBy: { criadoEm: "desc" },
      },
      _count: { select: { usuarios: true } },
    },
  });

  return res.json(tenants);
}

export async function detalhe(req: Request, res: Response) {
  const id = Number(req.params.id);

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      empresas: true,
      contratos: { include: { plano: true }, orderBy: { criadoEm: "desc" } },
      tenantModulos: { include: { modulo: true } },
      usuarios: {
        where: { isMaster: true },
        select: { id: true, nome: true, email: true, telefone: true, cargo: true, ativo: true, criadoEm: true },
      },
      _count: { select: { usuarios: true, faturas: true } },
    },
  });

  if (!tenant) return res.status(404).json({ error: "Cliente não encontrado." });
  return res.json(tenant);
}

export async function atualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { nome, status, corPrimaria, corSecundaria, nomeSistema } = req.body;

  const data: any = {};
  if (nome) data.nome = nome;
  if (status) data.status = status;
  if (corPrimaria) data.corPrimaria = corPrimaria;
  if (corSecundaria) data.corSecundaria = corSecundaria;
  if (nomeSistema !== undefined) data.nomeSistema = nomeSistema;

  const tenant = await prisma.tenant.update({ where: { id }, data });
  return res.json(tenant);
}

// Módulos do cliente
export async function listarModulos(req: Request, res: Response) {
  const tenantId = Number(req.params.id);
  const todos = await prisma.modulo.findMany({ orderBy: { nome: "asc" } });
  const ativos = await prisma.tenantModulo.findMany({ where: { tenantId } });
  const ativosIds = new Set(ativos.filter((m) => m.ativo).map((m) => m.moduloId));

  return res.json(todos.map((m) => ({ ...m, ativo: ativosIds.has(m.id) })));
}

export async function toggleModulo(req: Request, res: Response) {
  const tenantId = Number(req.params.id);
  const moduloId = Number(req.params.moduloId);
  const { ativo } = req.body;

  await prisma.tenantModulo.upsert({
    where: { tenantId_moduloId: { tenantId, moduloId } },
    update: { ativo },
    create: { tenantId, moduloId, ativo },
  });
  return res.json({ ok: true });
}

// Admins do cliente (usuários isMaster)
export async function listarAdmins(req: Request, res: Response) {
  const tenantId = Number(req.params.id);
  const admins = await prisma.usuario.findMany({
    where: { tenantId, isMaster: true },
    select: { id: true, nome: true, email: true, telefone: true, ativo: true, criadoEm: true },
    orderBy: { criadoEm: "asc" },
  });
  return res.json(admins);
}

export async function toggleAdmin(req: Request, res: Response) {
  const id = Number(req.params.usuarioId);
  const { ativo } = req.body;
  const usuario = await prisma.usuario.update({
    where: { id },
    data: { ativo },
    select: { id: true, nome: true, email: true, ativo: true },
  });
  return res.json(usuario);
}

// Stats gerais para dashboard
export async function stats(_req: Request, res: Response) {
  const [total, trials, ativos, inativos] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { origem: "TRIAL" } }),
    prisma.tenant.count({ where: { status: "ATIVO" } }),
    prisma.tenant.count({ where: { status: "INATIVO" } }),
  ]);
  return res.json({ total, trials, ativos, inativos });
}
