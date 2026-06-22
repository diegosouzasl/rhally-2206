import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type PortalTokenPayload = {
  sub: number; // id do Usuario
  tenantId: number;
  email: string;
  nome: string;
  jti?: string; // id da sessão (para logout forçado)
  trialEndsAt?: string | null; // ISO — presente quando a conta é de trial
};

/** Emite o JWT de sessão da plataforma. */
export function signPortalToken(payload: PortalTokenPayload): string {
  const options: SignOptions = { expiresIn: env.portalJwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.portalJwtSecret, options);
}

export function verifyPortalToken(token: string): PortalTokenPayload {
  return jwt.verify(token, env.portalJwtSecret) as unknown as PortalTokenPayload;
}
