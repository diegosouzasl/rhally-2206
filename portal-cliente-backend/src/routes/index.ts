import { Router } from "express";
import adminRhallyRoutes from "../admin-rhally/routes";
import { checkModulesPublic } from "../modules/modules.controller";
import { login, me } from "../auth/auth.controller";
import { autenticar, exigirPermissao } from "../auth/auth.middleware";
import * as sessions from "../auth/sessions.controller";
import * as twofa from "../auth/twofactor.controller";
import * as recovery from "../auth/recovery.controller";
import { loginGoogle } from "../auth/google.controller";
import * as solic from "../solicitacoes/solicitacoes.controller";
import * as historico from "../historico/historico.controller";
import { autenticarServico } from "../integracao/servico.middleware";
import * as empresasAdmin from "../admin/empresas.controller";
import * as perfisAdmin from "../admin/perfis.controller";
import * as usuariosAdmin from "../admin/usuarios.controller";
import { gerar, minhas, webhookAsaas } from "../faturamento/faturamento.controller";
import { iniciarSsoRhally } from "../integracao/sso.controller";
import { listar as listarAuditoria } from "../auditoria/auditoria.controller";
import { publicoPorSubdominio, obterMeu as obterWhiteLabel, atualizar as atualizarWhiteLabel } from "../whitelabel/whitelabel.controller";
import { registrarTrial } from "../trial/trial.controller";

const router = Router();

/* ---------------- Rotas públicas (consumidas pelo Rhally) ---------------- */

// Trial gratuito — autoatendimento, sem autenticação
router.post("/trial/registrar", registrarTrial);

// Checagem de módulos contratados por CNPJ (usado pelo ModulesContext do Rhally)
router.get("/modules/public/check", checkModulesPublic);

/* ---------------- Auth do portal ---------------- */
router.post("/auth/login", login);
router.get("/auth/me", autenticar, me);
router.post("/auth/google", loginGoogle);

// Recuperação de senha
router.post("/auth/recuperar", recovery.solicitar);
router.post("/auth/redefinir", recovery.redefinir);

// 2FA
router.post("/2fa/setup", autenticar, twofa.setup);
router.post("/2fa/enable", autenticar, twofa.enable);
router.post("/2fa/disable", autenticar, twofa.disable);

// Sessões ativas / logout forçado
router.get("/sessoes", autenticar, sessions.listar);
router.delete("/sessoes/:jti", autenticar, sessions.revogar);
router.post("/sessoes/revogar-todas", autenticar, sessions.revogarTudo);

/* ---------------- Faturamento (Asaas) ---------------- */
router.post("/faturas/gerar", autenticar, exigirPermissao("faturamento", "EDITAR"), gerar);
router.get("/faturas/minhas", autenticar, minhas);

// Webhook do Asaas (público — validado por token no header)
router.post("/webhooks/asaas", webhookAsaas);

/* ---------------- SSO com o Rhally ---------------- */
router.post("/sso/rhally", autenticar, iniciarSsoRhally);

/* ---------------- Solicitações / ServiceDesk ---------------- */
router.post("/solicitacoes", autenticar, solic.criar); // qualquer usuário pode abrir
router.get("/solicitacoes", autenticar, solic.listar);
router.get("/solicitacoes/:id", autenticar, solic.detalhe);
router.post("/solicitacoes/:id/responder", autenticar, solic.adicionarResposta);
router.patch("/solicitacoes/:id/status", autenticar, exigirPermissao("solicitacoes", "EDITAR"), solic.alterarStatus);

/* ---------------- Admin: Empresas ---------------- */
router.get("/empresas", autenticar, exigirPermissao("empresas", "VISUALIZAR"), empresasAdmin.listar);
router.post("/empresas", autenticar, exigirPermissao("empresas", "EDITAR"), empresasAdmin.criar);
router.put("/empresas/:id", autenticar, exigirPermissao("empresas", "EDITAR"), empresasAdmin.atualizar);

/* ---------------- Admin: Perfis & Permissões ---------------- */
router.get("/permissoes", autenticar, exigirPermissao("perfis", "VISUALIZAR"), perfisAdmin.listarPermissoes);
router.get("/perfis", autenticar, exigirPermissao("perfis", "VISUALIZAR"), perfisAdmin.listar);
router.post("/perfis", autenticar, exigirPermissao("perfis", "EDITAR"), perfisAdmin.criar);
router.put("/perfis/:id", autenticar, exigirPermissao("perfis", "EDITAR"), perfisAdmin.atualizar);
router.delete("/perfis/:id", autenticar, exigirPermissao("perfis", "EXCLUIR"), perfisAdmin.remover);

/* ---------------- Admin: Usuários ---------------- */
router.get("/usuarios", autenticar, exigirPermissao("usuarios", "VISUALIZAR"), usuariosAdmin.listar);
router.post("/usuarios", autenticar, exigirPermissao("usuarios", "EDITAR"), usuariosAdmin.criar);
router.put("/usuarios/:id", autenticar, exigirPermissao("usuarios", "EDITAR"), usuariosAdmin.atualizar);

/* ---------------- Histórico de Vida (por CPF) ---------------- */
// Ingestão de eventos por outros sistemas (Rhally): autenticação de serviço.
router.post("/historico/eventos", autenticarServico, historico.ingerir);
// Consulta da linha do tempo (usuário do portal com permissão).
router.get("/historico/:cpf", autenticar, exigirPermissao("historico", "VISUALIZAR"), historico.timeline);
router.get("/historico/:cpf/resumo", autenticar, exigirPermissao("historico", "VISUALIZAR"), historico.resumo);

/* ---------------- Auditoria ---------------- */
router.get("/auditoria", autenticar, exigirPermissao("auditoria", "VISUALIZAR"), listarAuditoria);

/* ---------------- White-label ---------------- */
router.get("/public/white-label", publicoPorSubdominio);
router.get("/tenant/white-label", autenticar, obterWhiteLabel);
router.put("/tenant/white-label", autenticar, exigirPermissao("configuracoes", "EDITAR"), atualizarWhiteLabel);

// Admin interno Rhally
router.use("/admin-rhally", adminRhallyRoutes);

export default router;
