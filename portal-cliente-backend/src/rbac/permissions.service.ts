import { prisma } from "../lib/prisma";

type Acao = "VISUALIZAR" | "EDITAR" | "EXCLUIR" | "EXPORTAR";

/**
 * Retorna true se o usuário possui a permissão (modulo + ação) através de
 * qualquer um de seus perfis (em qualquer empresa).
 */
export async function usuarioTemPermissao(
  usuarioId: number,
  modulo: string,
  acao: Acao
): Promise<boolean> {
  // Operador master tem acesso irrestrito.
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { isMaster: true },
  });
  if (usuario?.isMaster) return true;

  const count = await prisma.usuarioPerfil.count({
    where: {
      usuarioId,
      perfil: {
        permissoes: {
          some: { permissao: { modulo, acao } },
        },
      },
    },
  });
  return count > 0;
}

/** Lista as permissões efetivas do usuário (modulo:acao). */
export async function permissoesDoUsuario(usuarioId: number): Promise<string[]> {
  const perfis = await prisma.usuarioPerfil.findMany({
    where: { usuarioId },
    select: {
      perfil: {
        select: {
          permissoes: { select: { permissao: { select: { modulo: true, acao: true } } } },
        },
      },
    },
  });
  const set = new Set<string>();
  for (const up of perfis) {
    for (const pp of up.perfil.permissoes) {
      set.add(`${pp.permissao.modulo}:${pp.permissao.acao}`);
    }
  }
  return [...set];
}

/** Indica se o usuário é master ou tem o perfil "Administrador". */
export async function usuarioEhAdmin(usuarioId: number): Promise<boolean> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { isMaster: true },
  });
  if (usuario?.isMaster) return true;

  const count = await prisma.usuarioPerfil.count({
    where: { usuarioId, perfil: { nome: "Administrador" } },
  });
  return count > 0;
}
