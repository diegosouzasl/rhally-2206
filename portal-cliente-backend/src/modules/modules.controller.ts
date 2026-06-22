import { Request, Response } from "express";
import { getModulosAtivosPorCnpj } from "./modules.service";

/**
 * GET /modules/public/check?cnpj=<CNPJ>
 * Endpoint PÚBLICO consumido pelo Rhally (ModulesContext.jsx).
 * Resposta: { modules: string[] }
 */
export async function checkModulesPublic(req: Request, res: Response) {
  const cnpj = String(req.query.cnpj || "");
  if (!cnpj) {
    return res.status(400).json({ error: "Parâmetro 'cnpj' é obrigatório.", modules: [] });
  }

  try {
    const modules = await getModulosAtivosPorCnpj(cnpj);
    return res.json({ modules });
  } catch (error) {
    console.error("[modules/check] erro:", error);
    // Em erro, devolve lista vazia (o Rhally trata fallback liberando tudo).
    return res.status(500).json({ error: "Erro ao consultar módulos.", modules: [] });
  }
}
