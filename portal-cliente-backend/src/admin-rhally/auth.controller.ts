import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});

const criarSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
  role: z.enum(["SUPER", "COMERCIAL", "SUPORTE"]).optional(),
});

export async function login(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Dados inválidos." });

  const { email, senha } = parse.data;
  const usuario = await prisma.adminUsuario.findUnique({ where: { email: email.toLowerCase() } });
  if (!usuario || !usuario.ativo) return res.status(401).json({ error: "Credenciais inválidas." });

  const ok = await bcrypt.compare(senha, usuario.senhaHash);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas." });

  const token = jwt.sign(
    { sub: usuario.id, email: usuario.email, role: usuario.role, tipo: "admin" },
    env.portalJwtSecret,
    { expiresIn: "8h" }
  );

  return res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role } });
}

export async function me(req: Request, res: Response) {
  const admin = (req as any).adminUsuario;
  return res.json(admin);
}

export async function listar(req: Request, res: Response) {
  const usuarios = await prisma.adminUsuario.findMany({
    select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
    orderBy: { criadoEm: "desc" },
  });
  return res.json(usuarios);
}

export async function criar(req: Request, res: Response) {
  const parse = criarSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Dados inválidos.", details: parse.error.flatten() });

  const { nome, email, senha, role } = parse.data;
  const existe = await prisma.adminUsuario.findUnique({ where: { email: email.toLowerCase() } });
  if (existe) return res.status(409).json({ error: "E-mail já cadastrado." });

  const senhaHash = await bcrypt.hash(senha, 12);
  const usuario = await prisma.adminUsuario.create({
    data: { nome, email: email.toLowerCase(), senhaHash, role: role ?? "SUPORTE" },
    select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
  });
  return res.status(201).json(usuario);
}

export async function atualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { nome, role, ativo, senha } = req.body;

  const data: any = {};
  if (nome) data.nome = nome;
  if (role) data.role = role;
  if (typeof ativo === "boolean") data.ativo = ativo;
  if (senha) data.senhaHash = await bcrypt.hash(senha, 12);

  const usuario = await prisma.adminUsuario.update({
    where: { id },
    data,
    select: { id: true, nome: true, email: true, role: true, ativo: true },
  });
  return res.json(usuario);
}

export async function remover(req: Request, res: Response) {
  const id = Number(req.params.id);
  const admin = (req as any).adminUsuario;
  if (admin.id === id) return res.status(400).json({ error: "Não é possível excluir a própria conta." });
  await prisma.adminUsuario.delete({ where: { id } });
  return res.json({ ok: true });
}
