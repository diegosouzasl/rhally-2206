import crypto from "crypto";
import { Request } from "express";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

/** Converte "8h" / "30m" / "7d" em milissegundos. */
function durationMs(s: string): number {
  const m = /^(\d+)([smhd])$/.exec(s.trim());
  if (!m) return 8 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2] as "s" | "m" | "h" | "d"];
  return n * mult;
}

/** Cria uma sessão e retorna o jti a embutir no JWT. */
export async function criarSessao(usuarioId: number, req?: Request): Promise<string> {
  const jti = crypto.randomUUID();
  await prisma.sessao.create({
    data: {
      usuarioId,
      jti,
      ip: req?.ip,
      userAgent: req?.headers["user-agent"]?.slice(0, 255),
      expiraEm: new Date(Date.now() + durationMs(env.portalJwtExpiresIn)),
    },
  });
  return jti;
}

/** Valida se a sessão (jti) está ativa (existe, não revogada, não expirada). */
export async function sessaoValida(jti: string): Promise<boolean> {
  const s = await prisma.sessao.findUnique({ where: { jti } });
  if (!s || s.revogada) return false;
  if (s.expiraEm.getTime() < Date.now()) return false;
  return true;
}

export function listarSessoes(usuarioId: number) {
  return prisma.sessao.findMany({
    where: { usuarioId, revogada: false, expiraEm: { gt: new Date() } },
    orderBy: { criadoEm: "desc" },
    select: { id: true, jti: true, ip: true, userAgent: true, criadoEm: true, expiraEm: true },
  });
}

/** Revoga uma sessão específica (do próprio usuário). */
export async function revogarSessao(usuarioId: number, jti: string) {
  await prisma.sessao.updateMany({
    where: { usuarioId, jti },
    data: { revogada: true },
  });
}

/** Logout forçado em todos os dispositivos (opcionalmente exceto a sessão atual). */
export async function revogarTodas(usuarioId: number, exceptoJti?: string) {
  await prisma.sessao.updateMany({
    where: { usuarioId, jti: exceptoJti ? { not: exceptoJti } : undefined, revogada: false },
    data: { revogada: true },
  });
}
