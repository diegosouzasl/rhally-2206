import { prisma } from "../lib/prisma";
import { onlyDigits } from "../modules/modules.service";
import * as asaas from "../asaas/asaas.client";

type BillingType = "BOLETO" | "PIX" | "CREDIT_CARD" | "UNDEFINED";

/**
 * Garante que exista um customer no Asaas para o tenant (usa a empresa
 * principal/primeira do tenant como dados fiscais). Retorna o customerId.
 * O id do Asaas fica guardado na empresa principal.
 */
async function garantirClienteAsaas(tenantId: number): Promise<string> {
  const empresa = await prisma.empresa.findFirst({
    where: { tenantId },
    orderBy: { id: "asc" },
  });
  if (!empresa) throw new Error("Tenant sem empresa cadastrada para faturar.");
  if (empresa.asaasCustomerId) return empresa.asaasCustomerId;

  const customer = await asaas.createCustomer({
    name: empresa.razaoSocial,
    cpfCnpj: onlyDigits(empresa.cnpj),
  });

  await prisma.empresa.update({
    where: { id: empresa.id },
    data: { asaasCustomerId: customer.id },
  });
  return customer.id;
}

function venceNoMes(competencia: string, diaVencimento: number): Date {
  // competencia = "YYYY-MM"
  const [ano, mes] = competencia.split("-").map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dia = Math.min(diaVencimento, ultimoDia);
  return new Date(ano, mes - 1, dia);
}

/**
 * Gera a fatura de um contrato para uma competência (YYYY-MM):
 * cria a cobrança no Asaas e persiste a Fatura com o link de pagamento.
 */
export async function gerarFatura(params: {
  contratoId: number;
  competencia: string;
  billingType?: BillingType;
}) {
  const { contratoId, competencia } = params;
  const billingType = params.billingType || "BOLETO";

  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    include: { tenant: true },
  });
  if (!contrato) throw new Error("Contrato não encontrado.");

  // Evita duplicar (regra única [contratoId, competencia])
  const existente = await prisma.fatura.findUnique({
    where: { contratoId_competencia: { contratoId, competencia } },
  });
  if (existente) return existente;

  const vencimento = venceNoMes(competencia, contrato.diaVencimento);
  const valor = Number(contrato.valorMensal);

  const customerId = await garantirClienteAsaas(contrato.tenantId);

  // Cria a fatura localmente primeiro (status PENDENTE) p/ ter o externalReference
  const fatura = await prisma.fatura.create({
    data: {
      contratoId,
      tenantId: contrato.tenantId,
      competencia,
      valor,
      vencimento,
      status: "PENDENTE",
      billingType,
    },
  });

  let charge: asaas.AsaasCharge;
  try {
    charge = await asaas.createCharge({
      customer: customerId,
      billingType,
      value: valor,
      dueDate: vencimento.toISOString().slice(0, 10),
      description: `Rhally — ${contrato.tenant.nome} — ${competencia}`,
      externalReference: String(fatura.id),
    });
  } catch (err) {
    // Cobrança falhou → desfaz a fatura local para não deixar órfã.
    await prisma.fatura.delete({ where: { id: fatura.id } }).catch(() => {});
    throw err;
  }

  return prisma.fatura.update({
    where: { id: fatura.id },
    data: { asaasChargeId: charge.id, invoiceUrl: charge.invoiceUrl },
  });
}

/** Marca uma fatura como paga (chamado pelo webhook do Asaas). */
export async function marcarFaturaPaga(asaasChargeId: string, valorPago: number) {
  const fatura = await prisma.fatura.findUnique({ where: { asaasChargeId } });
  if (!fatura) return null;
  if (fatura.status === "PAGA") return fatura;

  await prisma.pagamento.create({
    data: { faturaId: fatura.id, valor: valorPago, metodo: fatura.billingType || undefined },
  });

  return prisma.fatura.update({
    where: { id: fatura.id },
    data: { status: "PAGA", pagoEm: new Date() },
  });
}

/** Lista faturas de um tenant. */
export function listarFaturasDoTenant(tenantId: number) {
  return prisma.fatura.findMany({
    where: { tenantId },
    orderBy: { vencimento: "desc" },
  });
}
