import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

/**
 * Integração com o Rhally. Todos os tokens são assinados com o MESMO segredo
 * do Rhally (RHALLY_JWT_PASS), conforme o contrato em PortalSsoController /
 * autenticarServico do rhally-backend.
 */

const SOURCE = "portal-cliente";

/** Token de SERVIÇO (age como superadmin nas rotas /portal/* do Rhally). */
function gerarServiceToken(): string {
  const opts: SignOptions = { expiresIn: "2m" };
  return jwt.sign({ sourceSystem: SOURCE, isSuperadmin: true }, env.rhallyJwtPass, opts);
}

/** Token de HANDOFF (SSO) — loga um usuário específico no Rhally. */
export function gerarPortalToken(usuario: {
  email: string;
  nome: string;
  isAdmin: boolean;
}): string {
  const opts: SignOptions = { expiresIn: "2m" };
  return jwt.sign(
    {
      email: usuario.email,
      name: usuario.nome,
      isAdmin: usuario.isAdmin,
      isSuperadmin: false,
      sourceSystem: SOURCE,
    },
    env.rhallyJwtPass,
    opts
  );
}

export type NovaEmpresaRhally = Record<string, unknown> & {
  admins: Array<Record<string, unknown>>;
};

/** Cria uma empresa no Rhally via POST /portal/newEnterprise (token de serviço). */
export async function criarEmpresaNoRhally(payload: NovaEmpresaRhally) {
  const res = await fetch(`${env.rhallyApiUrl}/portal/newEnterprise`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gerarServiceToken()}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data?.message || `Rhally respondeu ${res.status}`) as Error & {
      status?: number;
      body?: unknown;
    };
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}
