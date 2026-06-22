import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { registrarLog } from "../auditoria/auditoria.service";

const WL_SELECT = {
  nomeSistema: true,
  logoUrl: true,
  faviconUrl: true,
  corPrimaria: true,
  corSecundaria: true,
};

/** GET /api/public/white-label?subdominio=demo — config visual pública (tela de login). */
export async function publicoPorSubdominio(req: Request, res: Response) {
  const subdominio = String(req.query.subdominio || "");
  if (!subdominio) return res.status(400).json({ error: "subdominio é obrigatório." });

  const tenant = await prisma.tenant.findUnique({
    where: { subdominio },
    select: { nome: true, status: true, ...WL_SELECT },
  });
  if (!tenant || tenant.status !== "ATIVO") {
    return res.status(404).json({ error: "Tenant não encontrado." });
  }
  const { status, ...visual } = tenant;
  return res.json(visual);
}

/** GET /api/tenant/white-label — config do tenant do usuário autenticado. */
export async function obterMeu(req: Request, res: Response) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.usuario!.tenantId },
    select: { nome: true, subdominio: true, dominioCustom: true, ...WL_SELECT },
  });
  return res.json(tenant);
}

const updateSchema = z.object({
  nomeSistema: z.string().max(120).optional(),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  faviconUrl: z.string().url().max(500).optional().or(z.literal("")),
  corPrimaria: z.string().regex(/^#([0-9a-fA-F]{6})$/, "cor inválida").optional(),
  corSecundaria: z.string().regex(/^#([0-9a-fA-F]{6})$/, "cor inválida").optional(),
});

/** PUT /api/tenant/white-label — atualiza (permissão configuracoes:EDITAR). */
export async function atualizar(req: Request, res: Response) {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  const tenantId = req.usuario!.tenantId;
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: parse.data,
    select: { nome: true, ...WL_SELECT },
  });

  await registrarLog({
    tenantId,
    usuarioId: req.usuario!.sub,
    acao: "editar",
    modulo: "configuracoes",
    entidade: "white-label",
    detalhes: parse.data,
    req,
  });

  return res.json(tenant);
}
