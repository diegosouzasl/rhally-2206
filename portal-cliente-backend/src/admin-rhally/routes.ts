import { Router } from "express";
import { autenticarAdmin, exigirRole } from "./auth.middleware";
import * as auth from "./auth.controller";
import * as clientes from "./clientes.controller";
import * as contratos from "./contratos.controller";
import * as faturas from "./faturas.controller";
import * as stats from "./stats.controller";

const router = Router();

// Auth
router.post("/auth/login", auth.login);
router.get("/auth/me", autenticarAdmin, auth.me);

// Usuários internos (só SUPER pode gerenciar)
router.get("/usuarios", autenticarAdmin, exigirRole("SUPER"), auth.listar);
router.post("/usuarios", autenticarAdmin, exigirRole("SUPER"), auth.criar);
router.patch("/usuarios/:id", autenticarAdmin, exigirRole("SUPER"), auth.atualizar);
router.delete("/usuarios/:id", autenticarAdmin, exigirRole("SUPER"), auth.remover);

// Dashboard stats
router.get("/stats", autenticarAdmin, clientes.stats);
router.get("/stats/modulos-uso", autenticarAdmin, stats.modulosUso);

// Clientes
router.get("/clientes", autenticarAdmin, clientes.listar);
router.get("/clientes/:id", autenticarAdmin, clientes.detalhe);
router.patch("/clientes/:id", autenticarAdmin, exigirRole("SUPER", "COMERCIAL"), clientes.atualizar);

// Módulos do cliente
router.get("/clientes/:id/modulos", autenticarAdmin, clientes.listarModulos);
router.patch("/clientes/:id/modulos/:moduloId", autenticarAdmin, exigirRole("SUPER", "COMERCIAL"), clientes.toggleModulo);

// Admins do cliente
router.get("/clientes/:id/admins", autenticarAdmin, clientes.listarAdmins);
router.patch("/clientes/:id/admins/:usuarioId", autenticarAdmin, exigirRole("SUPER", "COMERCIAL"), clientes.toggleAdmin);

// Contratos
router.get("/planos", autenticarAdmin, contratos.listarPlanos);
router.get("/clientes/:id/contratos", autenticarAdmin, contratos.listar);
router.post("/clientes/:id/contratos", autenticarAdmin, exigirRole("SUPER", "COMERCIAL"), contratos.criar);
router.patch("/clientes/:id/contratos/:contratoId", autenticarAdmin, exigirRole("SUPER", "COMERCIAL"), contratos.atualizar);

// Faturas
router.get("/clientes/:id/faturas", autenticarAdmin, faturas.listar);
router.get("/clientes/:id/faturas/resumo", autenticarAdmin, faturas.resumoFinanceiro);
router.post("/clientes/:id/faturas", autenticarAdmin, exigirRole("SUPER", "COMERCIAL"), faturas.gerar);
router.patch("/clientes/:id/faturas/:faturaId", autenticarAdmin, exigirRole("SUPER", "COMERCIAL"), faturas.atualizarStatus);

export default router;
