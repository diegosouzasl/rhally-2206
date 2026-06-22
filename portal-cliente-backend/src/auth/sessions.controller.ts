import { Request, Response } from "express";
import { listarSessoes, revogarSessao, revogarTodas } from "./sessions.service";
import { registrarLog } from "../auditoria/auditoria.service";

/** GET /api/sessoes — sessões ativas do usuário autenticado. */
export async function listar(req: Request, res: Response) {
  const sessoes = await listarSessoes(req.usuario!.sub);
  const atual = req.usuario!.jti;
  return res.json(sessoes.map((s) => ({ ...s, atual: s.jti === atual })));
}

/** DELETE /api/sessoes/:jti — revoga uma sessão específica. */
export async function revogar(req: Request, res: Response) {
  await revogarSessao(req.usuario!.sub, req.params.jti);
  return res.json({ ok: true });
}

/** POST /api/sessoes/revogar-todas — logout forçado em todos os dispositivos. */
export async function revogarTudo(req: Request, res: Response) {
  const manterAtual = req.body?.manterAtual !== false; // por padrão mantém a sessão atual
  await revogarTodas(req.usuario!.sub, manterAtual ? req.usuario!.jti : undefined);
  await registrarLog({
    tenantId: req.usuario!.tenantId,
    usuarioId: req.usuario!.sub,
    acao: "logout_forcado",
    modulo: "auth",
    req,
  });
  return res.json({ ok: true });
}
