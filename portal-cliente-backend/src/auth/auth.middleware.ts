import { Request, Response, NextFunction } from "express";
import { verifyPortalToken, PortalTokenPayload } from "./jwt";
import { usuarioTemPermissao } from "../rbac/permissions.service";
import { sessaoValida } from "./sessions.service";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: PortalTokenPayload;
    }
  }
}

/** Exige um JWT válido no header Authorization: Bearer <token> e sessão ativa. */
export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Token não enviado." });
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ error: "Formato de autorização inválido." });
  }

  let payload: PortalTokenPayload;
  try {
    payload = verifyPortalToken(token);
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }

  // Logout forçado: se a sessão foi revogada, o token deixa de valer.
  if (payload.jti && !(await sessaoValida(payload.jti))) {
    return res.status(401).json({ error: "Sessão encerrada. Faça login novamente." });
  }

  req.usuario = payload;
  return next();
}

/** Exige que o usuário autenticado tenha a permissão (modulo + ação). */
export function exigirPermissao(modulo: string, acao: "VISUALIZAR" | "EDITAR" | "EXCLUIR" | "EXPORTAR") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const u = req.usuario;
    if (!u) return res.status(401).json({ error: "Não autenticado." });
    const ok = await usuarioTemPermissao(u.sub, modulo, acao);
    if (!ok) {
      return res.status(403).json({ error: "Sem permissão para esta ação." });
    }
    return next();
  };
}
