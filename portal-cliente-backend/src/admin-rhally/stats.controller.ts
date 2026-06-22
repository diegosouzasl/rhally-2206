import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import mysql from "mysql2/promise";

const RHALLYDB = {
  host: "172.17.0.1",
  port: 3306,
  user: "rhallyuser",
  password: "tech@rhallyasBdh3@awe#8653254fjbdfaaA",
  database: "rhallydb",
};

// Maps module name -> list of {table, col} to sum
const MODULE_TABLES: Record<string, { table: string; col: string }[]> = {
  Produtividade: [
    { table: "pontoeletronico", col: "idEnterprise" },
    { table: "banco_horas", col: "id_enterprise" },
  ],
  People: [
    { table: "admissions", col: "enterprise_id" },
    { table: "documentos", col: "idEnterprise" },
  ],
  Talent: [{ table: "talent_jobs", col: "enterprise_id" }],
  Safety: [
    { table: "epi", col: "idEnterprise" },
    { table: "nr1_pgr_versoes", col: "enterprise_id" },
  ],
  Remuneração: [{ table: "holerites", col: "enterprise_id" }],
  Cultura: [{ table: "one_on_one_sessions", col: "enterprise_id" }],
  Compliance: [{ table: "compliance_tokens", col: "enterprise_id" }],
  Benefícios: [{ table: "beneficio_funcionario", col: "idEmpresa" }],
};

export async function modulosUso(_req: Request, res: Response) {
  // Get all tenants with their empresa CNPJs
  const tenants = await prisma.tenant.findMany({
    where: { status: "ATIVO" },
    include: { empresas: { select: { cnpj: true } } },
  });

  const conn = await mysql.createConnection(RHALLYDB);

  try {
    // Build cnpj -> enterprise_id map
    const [enterprises] = await conn.query<any[]>(
      "SELECT id, cnpj FROM enterprise"
    );
    const cnpjToEntId: Record<string, number> = {};
    for (const e of enterprises) {
      // normalize cnpj: remove non-digits
      const normalized = String(e.cnpj).replace(/\D/g, "");
      cnpjToEntId[normalized] = e.id;
    }

    // For each module, get counts grouped by enterprise_id
    const moduleEntCounts: Record<string, Record<number, number>> = {};

    for (const [modName, tables] of Object.entries(MODULE_TABLES)) {
      moduleEntCounts[modName] = {};
      for (const { table, col } of tables) {
        try {
          const [rows] = await conn.query<any[]>(
            `SELECT \`${col}\` as eid, COUNT(*) as cnt FROM \`${table}\` GROUP BY \`${col}\``
          );
          for (const row of rows) {
            if (!row.eid) continue;
            moduleEntCounts[modName][row.eid] =
              (moduleEntCounts[modName][row.eid] ?? 0) + Number(row.cnt);
          }
        } catch {
          // table may not exist yet
        }
      }
    }

    // Build per-tenant module usage
    const result = tenants
      .map((t) => {
        const cnpjs = t.empresas
          .map((e) => e.cnpj?.replace(/\D/g, "") ?? "")
          .filter(Boolean);
        const entIds = cnpjs
          .map((c) => cnpjToEntId[c])
          .filter((id): id is number => !!id);

        const modulos = Object.entries(moduleEntCounts)
          .map(([nome, entMap]) => {
            const total = entIds.reduce((s, id) => s + (entMap[id] ?? 0), 0);
            return { nome, total };
          })
          .filter((m) => m.total > 0)
          .sort((a, b) => b.total - a.total);

        return {
          tenantId: t.id,
          nome: t.nome,
          modulos,
          totalUso: modulos.reduce((s, m) => s + m.total, 0),
        };
      })
      .filter((t) => t.totalUso > 0)
      .sort((a, b) => b.totalUso - a.totalUso);

    // Global ranking
    const globalMap: Record<string, number> = {};
    for (const [modName, entMap] of Object.entries(moduleEntCounts)) {
      globalMap[modName] = Object.values(entMap).reduce((s, v) => s + v, 0);
    }
    const globalRanking = Object.entries(globalMap)
      .map(([nome, total]) => ({ nome, total }))
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total);

    return res.json({ globalRanking, porCliente: result });
  } finally {
    await conn.end();
  }
}
