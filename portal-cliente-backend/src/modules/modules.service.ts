import { prisma } from "../lib/prisma";

/** Normaliza CNPJ removendo tudo que não for dígito. */
export function onlyDigits(cnpj: string): string {
  return (cnpj || "").replace(/\D/g, "");
}

/**
 * Retorna os slugs de módulos ativos contratados pelo TENANT dono do CNPJ.
 * Busca a empresa pelo CNPJ → tenant → módulos contratados do tenant.
 * Usado pelo Rhally (frontend) em GET /modules/public/check.
 */
export async function getModulosAtivosPorCnpj(cnpj: string): Promise<string[]> {
  const cnpjDigits = onlyDigits(cnpj);
  if (!cnpjDigits) return [];

  const empresa = await prisma.empresa.findUnique({
    where: { cnpj: cnpjDigits },
    select: {
      tenant: {
        select: {
          status: true,
          tenantModulos: {
            where: { ativo: true, modulo: { ativo: true } },
            select: { modulo: { select: { slug: true } } },
          },
        },
      },
    },
  });

  const tenant = empresa?.tenant;
  // Empresa inexistente, ou tenant inativo/suspenso → nenhum módulo liberado.
  if (!tenant || tenant.status !== "ATIVO") return [];

  return tenant.tenantModulos.map((tm) => tm.modulo.slug);
}
