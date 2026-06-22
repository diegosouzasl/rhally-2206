import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { registrarLog } from "../auditoria/auditoria.service";

/** GET /api/permissoes — catálogo de permissões (modulo + ação). */
export async function listarPermissoes(_req: Request, res: Response) {
  const permissoes = await prisma.permissao.findMany({ orderBy: [{ modulo: "asc" }, { acao: "asc" }] });
  return res.json(permissoes);
}

/** GET /api/perfis — perfis do tenant com suas permissões. */
export async function listar(req: Request, res: Response) {
  const perfis = await prisma.perfil.findMany({
    where: { tenantId: req.usuario!.tenantId },
    orderBy: { nome: "asc" },
    include: {
      permissoes: { select: { permissaoId: true } },
      _count: { select: { usuarioPerfis: true } },
    },
  });
  return res.json(
    perfis.map((p) => ({
      id: p.id, nome: p.nome, descricao: p.descricao,
      permissaoIds: p.permissoes.map((pp) => pp.permissaoId),
      usuarios: p._count.usuarioPerfis,
    }))
  );
}

const schema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  permissaoIds: z.array(z.number().int()).default([]),
});

/** POST /api/perfis — cria perfil com permissões. */
export async function criar(req: Request, res: Response) {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  const { nome, descricao, permissaoIds } = parse.data;
  const tenantId = req.usuario!.tenantId;

  const existe = await prisma.perfil.findUnique({ where: { tenantId_nome: { tenantId, nome } } });
  if (existe) return res.status(409).json({ error: "Já existe um perfil com este nome." });

  const perfil = await prisma.perfil.create({
    data: {
      tenantId, nome, descricao,
      permissoes: { create: permissaoIds.map((permissaoId) => ({ permissaoId })) },
    },
  });
  await registrarLog({
    tenantId, usuarioId: req.usuario!.sub,
    acao: "criar", modulo: "perfis", entidade: "perfil", entidadeId: perfil.id, req,
  });
  return res.status(201).json(perfil);
}

/** PUT /api/perfis/:id — atualiza nome/descrição e redefine permissões. */
export async function atualizar(req: Request, res: Response) {
  const parse = schema.partial().safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  const id = Number(req.params.id);
  const tenantId = req.usuario!.tenantId;
  const perfil = await prisma.perfil.findFirst({ where: { id, tenantId } });
  if (!perfil) return res.status(404).json({ error: "Perfil não encontrado." });

  await prisma.perfil.update({
    where: { id },
    data: { nome: parse.data.nome, descricao: parse.data.descricao },
  });

  // Redefine permissões se enviadas
  if (parse.data.permissaoIds) {
    await prisma.perfilPermissao.deleteMany({ where: { perfilId: id } });
    await prisma.perfilPermissao.createMany({
      data: parse.data.permissaoIds.map((permissaoId) => ({ perfilId: id, permissaoId })),
    });
  }
  await registrarLog({
    tenantId, usuarioId: req.usuario!.sub,
    acao: "editar", modulo: "perfis", entidade: "perfil", entidadeId: id, req,
  });
  return res.json({ ok: true });
}

/** DELETE /api/perfis/:id */
export async function remover(req: Request, res: Response) {
  const id = Number(req.params.id);
  const tenantId = req.usuario!.tenantId;
  const perfil = await prisma.perfil.findFirst({ where: { id, tenantId } });
  if (!perfil) return res.status(404).json({ error: "Perfil não encontrado." });
  await prisma.perfil.delete({ where: { id } });
  await registrarLog({
    tenantId, usuarioId: req.usuario!.sub,
    acao: "excluir", modulo: "perfis", entidade: "perfil", entidadeId: id, req,
  });
  return res.json({ ok: true });
}
