import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../auth/password";
import { registrarLog } from "../auditoria/auditoria.service";

/** GET /api/usuarios — usuários do tenant com empresas e perfis. */
export async function listar(req: Request, res: Response) {
  const usuarios = await prisma.usuario.findMany({
    where: { tenantId: req.usuario!.tenantId },
    orderBy: { nome: "asc" },
    select: {
      id: true, nome: true, email: true, cargo: true, ativo: true, isMaster: true,
      ultimoLogin: true, twoFactorEnabled: true,
      usuarioEmpresas: { select: { empresa: { select: { id: true, razaoSocial: true } } } },
      usuarioPerfis: { select: { perfil: { select: { id: true, nome: true } }, empresaId: true } },
    },
  });
  return res.json(usuarios);
}

const criarSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
  cargo: z.string().optional(),
  telefone: z.string().optional(),
  departamento: z.string().optional(),
  isMaster: z.boolean().optional(),
  empresaIds: z.array(z.number().int()).default([]),
  // atribuição de perfis: [{ perfilId, empresaId }]
  perfis: z.array(z.object({ perfilId: z.number().int(), empresaId: z.number().int() })).default([]),
});

/** POST /api/usuarios — cria usuário, vincula empresas e perfis. */
export async function criar(req: Request, res: Response) {
  const parse = criarSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  const tenantId = req.usuario!.tenantId;
  const d = parse.data;

  const existe = await prisma.usuario.findUnique({ where: { email: d.email.toLowerCase() } });
  if (existe) return res.status(409).json({ error: "Já existe usuário com este e-mail." });

  const senhaHash = await hashPassword(d.senha);
  const usuario = await prisma.usuario.create({
    data: {
      tenantId,
      nome: d.nome,
      email: d.email.toLowerCase(),
      senhaHash,
      cargo: d.cargo,
      telefone: d.telefone,
      departamento: d.departamento,
      isMaster: d.isMaster ?? false,
      usuarioEmpresas: { create: d.empresaIds.map((empresaId) => ({ empresaId })) },
      usuarioPerfis: { create: d.perfis.map((p) => ({ perfilId: p.perfilId, empresaId: p.empresaId })) },
    },
  });
  await registrarLog({
    tenantId, usuarioId: req.usuario!.sub,
    acao: "criar", modulo: "usuarios", entidade: "usuario", entidadeId: usuario.id, req,
  });
  return res.status(201).json({ id: usuario.id, nome: usuario.nome, email: usuario.email });
}

const editarSchema = z.object({
  nome: z.string().min(2).optional(),
  cargo: z.string().optional(),
  telefone: z.string().optional(),
  departamento: z.string().optional(),
  ativo: z.boolean().optional(),
  isMaster: z.boolean().optional(),
  empresaIds: z.array(z.number().int()).optional(),
  perfis: z.array(z.object({ perfilId: z.number().int(), empresaId: z.number().int() })).optional(),
});

/** PUT /api/usuarios/:id — edita dados, status, vínculos de empresa e perfis. */
export async function atualizar(req: Request, res: Response) {
  const parse = editarSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  const id = Number(req.params.id);
  const tenantId = req.usuario!.tenantId;
  const usuario = await prisma.usuario.findFirst({ where: { id, tenantId } });
  if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

  const d = parse.data;
  await prisma.usuario.update({
    where: { id },
    data: {
      nome: d.nome, cargo: d.cargo, telefone: d.telefone,
      departamento: d.departamento, ativo: d.ativo, isMaster: d.isMaster,
    },
  });

  if (d.empresaIds) {
    await prisma.usuarioEmpresa.deleteMany({ where: { usuarioId: id } });
    await prisma.usuarioEmpresa.createMany({ data: d.empresaIds.map((empresaId) => ({ usuarioId: id, empresaId })) });
  }
  if (d.perfis) {
    await prisma.usuarioPerfil.deleteMany({ where: { usuarioId: id } });
    await prisma.usuarioPerfil.createMany({
      data: d.perfis.map((p) => ({ usuarioId: id, perfilId: p.perfilId, empresaId: p.empresaId })),
    });
  }
  await registrarLog({
    tenantId, usuarioId: req.usuario!.sub,
    acao: "editar", modulo: "usuarios", entidade: "usuario", entidadeId: id, req,
  });
  return res.json({ ok: true });
}
