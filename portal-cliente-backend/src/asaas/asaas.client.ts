import { env } from "../config/env";

/**
 * Cliente mínimo da API do Asaas (https://docs.asaas.com).
 * Autenticação via header `access_token`. Use o sandbox em dev.
 */

export class AsaasError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = "AsaasError";
  }
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.asaasApiKey) {
    throw new AsaasError(500, "ASAAS_API_KEY não configurada no .env");
  }
  const res = await fetch(`${env.asaasBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: env.asaasApiKey,
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg =
      (data?.errors && data.errors[0]?.description) ||
      `Asaas respondeu ${res.status}`;
    throw new AsaasError(res.status, msg, data);
  }
  return data as T;
}

export type AsaasCustomer = { id: string; name: string; cpfCnpj: string };
export type AsaasCharge = {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  billingType: string;
};

/** Cria um cliente no Asaas. */
export function createCustomer(input: {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Cria uma cobrança (fatura) no Asaas. */
export function createCharge(input: {
  customer: string; // id do customer no Asaas
  billingType: "BOLETO" | "PIX" | "CREDIT_CARD" | "UNDEFINED";
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string; // id da nossa fatura
}): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>("/payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Consulta uma cobrança pelo id. */
export function getCharge(id: string): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>(`/payments/${id}`);
}
