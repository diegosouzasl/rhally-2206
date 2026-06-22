import { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { AsaasError } from "../asaas/asaas.client";
import {
  gerarFatura,
  marcarFaturaPaga,
  listarFaturasDoTenant,
} from "./faturamento.service";
import { registrarLog } from "../auditoria/auditoria.service";

const gerarSchema = z.object({
  contratoId: z.number().int().positive(),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, "competencia deve ser YYYY-MM"),
  billingType: z.enum(["BOLETO", "PIX", "CREDIT_CARD", "UNDEFINED"]).optional(),
});

/** POST /api/faturas/gerar (admin) — gera fatura + cobrança no Asaas. */
export async function gerar(req: Request, res: Response) {
  const parse = gerarSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "validation_error", details: parse.error.flatten() });
  }
  try {
    const fatura = await gerarFatura(parse.data);
    await registrarLog({
      tenantId: req.usuario!.tenantId,
      usuarioId: req.usuario!.sub,
      acao: "criar",
      modulo: "faturamento",
      entidade: "fatura",
      entidadeId: fatura.id,
      detalhes: { competencia: parse.data.competencia },
      req,
    });
    return res.status(201).json(fatura);
  } catch (e) {
    if (e instanceof AsaasError) {
      return res.status(502).json({ error: "asaas_error", message: e.message });
    }
    console.error("[faturas/gerar] erro:", e);
    return res.status(500).json({ error: "Erro ao gerar fatura." });
  }
}

/** GET /api/faturas/minhas — faturas do tenant do usuário autenticado. */
export async function minhas(req: Request, res: Response) {
  const tenantId = req.usuario!.tenantId;
  const faturas = await listarFaturasDoTenant(tenantId);
  return res.json(faturas);
}

/**
 * POST /api/webhooks/asaas — recebe eventos de pagamento do Asaas.
 * Validação simples por token no header `asaas-access-token`.
 */
export async function webhookAsaas(req: Request, res: Response) {
  if (env.asaasWebhookToken) {
    const token = req.headers["asaas-access-token"];
    if (token !== env.asaasWebhookToken) {
      return res.status(401).json({ error: "Webhook não autorizado." });
    }
  }

  const event = req.body?.event as string | undefined;
  const payment = req.body?.payment as { id?: string; value?: number } | undefined;

  if (
    (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") &&
    payment?.id
  ) {
    try {
      await marcarFaturaPaga(payment.id, Number(payment.value || 0));
    } catch (e) {
      console.error("[webhook asaas] erro ao processar:", e);
    }
  }

  // Sempre 200 para o Asaas não reenviar indefinidamente.
  return res.json({ received: true });
}
