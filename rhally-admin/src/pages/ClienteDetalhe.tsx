import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiCheck, FiX, FiAlertCircle, FiClock, FiDollarSign, FiFileText, FiUsers, FiGrid, FiInfo } from "react-icons/fi";
import { api } from "../lib/api";
import { StatusBadge, OrigemBadge } from "./Dashboard";

const ABAS = [
  { key: "geral", label: "Geral", icon: <FiInfo size={14} /> },
  { key: "modulos", label: "Módulos", icon: <FiGrid size={14} /> },
  { key: "contrato", label: "Contrato", icon: <FiFileText size={14} /> },
  { key: "faturas", label: "Faturas", icon: <FiDollarSign size={14} /> },
  { key: "admins", label: "Administradores", icon: <FiUsers size={14} /> },
];

const STATUS_FATURA_CLS: any = {
  PENDENTE: "adm-badge-yellow",
  PAGA: "adm-badge-green",
  ATRASADA: "adm-badge-red",
  CANCELADA: "adm-badge-gray",
};

export default function ClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<any>(null);
  const [aba, setAba] = useState("geral");
  const [modulos, setModulos] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [showContrato, setShowContrato] = useState(false);
  const [showFatura, setShowFatura] = useState(false);
  const [contratoForm, setContratoForm] = useState({ planoId: "", dataInicio: "", valorMensal: "", diaVencimento: "10", urlContratoPdf: "", observacoes: "" });
  const [faturaForm, setFaturaForm] = useState({ contratoId: "", competencia: "", vencimento: "", valor: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    api.get(`/clientes/${id}`).then(setCliente).catch(() => toast.error("Erro ao carregar cliente"));
    api.get(`/clientes/${id}/modulos`).then(setModulos).catch(() => {});
    api.get(`/planos`).then(setPlanos).catch(() => {});
    api.get(`/clientes/${id}/faturas`).then(setFaturas).catch(() => {});
    api.get(`/clientes/${id}/faturas/resumo`).then(setResumo).catch(() => {});
  }

  useEffect(() => { load(); }, [id]);

  async function toggleModulo(moduloId: number, ativo: boolean) {
    try {
      await api.patch(`/clientes/${id}/modulos/${moduloId}`, { ativo });
      setModulos(m => m.map(x => x.id === moduloId ? { ...x, ativo } : x));
      toast.success(ativo ? "Módulo ativado!" : "Módulo desativado!");
    } catch { toast.error("Erro ao atualizar módulo"); }
  }

  async function toggleTodosModulos(ativo: boolean) {
    try {
      await Promise.all(modulos.map(m => api.patch(`/clientes/${id}/modulos/${m.id}`, { ativo })));
      setModulos(m => m.map(x => ({ ...x, ativo })));
      toast.success(ativo ? "Todos os módulos ativados!" : "Todos os módulos desativados!");
    } catch { toast.error("Erro ao atualizar módulos"); }
  }

  async function toggleAdmin(usuarioId: number, ativo: boolean) {
    try {
      await api.patch(`/clientes/${id}/admins/${usuarioId}`, { ativo });
      load();
    } catch { toast.error("Erro ao atualizar administrador"); }
  }

  async function salvarContrato(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/clientes/${id}/contratos`, {
        planoId: Number(contratoForm.planoId),
        dataInicio: contratoForm.dataInicio,
        valorMensal: Number(contratoForm.valorMensal),
        diaVencimento: Number(contratoForm.diaVencimento),
        urlContratoPdf: contratoForm.urlContratoPdf || null,
        observacoes: contratoForm.observacoes || null,
      });
      toast.success("Contrato salvo!");
      setShowContrato(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  }

  async function gerarFatura(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/clientes/${id}/faturas`, {
        contratoId: Number(faturaForm.contratoId),
        competencia: faturaForm.competencia,
        vencimento: faturaForm.vencimento,
        valor: faturaForm.valor ? Number(faturaForm.valor) : undefined,
      });
      toast.success("Fatura gerada!");
      setShowFatura(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  }

  async function marcarPaga(faturaId: number) {
    try {
      await api.patch(`/clientes/${id}/faturas/${faturaId}`, { status: "PAGA" });
      toast.success("Fatura marcada como paga!");
      load();
    } catch { toast.error("Erro ao atualizar fatura"); }
  }

  async function atualizarStatus(status: string) {
    try {
      await api.patch(`/clientes/${id}`, { status });
      load();
      toast.success("Status atualizado!");
    } catch { toast.error("Erro ao atualizar status"); }
  }

  if (!cliente) return <div className="adm-page"><div className="adm-empty">Carregando...</div></div>;

  const contrato = cliente.contratos?.[0];
  const empresa = cliente.empresas?.[0];
  const modulosAtivos = modulos.filter(m => m.ativo).length;

  return (
    <div className="adm-page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ marginBottom: 12 }} onClick={() => navigate("/clientes")}>← Voltar</button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{cliente.nome}</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <OrigemBadge origem={cliente.origem} />
            <StatusBadge status={cliente.status} />
            {cliente.trialEndsAt && (
              <span className="adm-badge adm-badge-yellow">
                <FiClock size={10} /> Trial até {new Date(cliente.trialEndsAt).toLocaleDateString("pt-BR")}
              </span>
            )}
            <span className="adm-badge adm-badge-gray">{modulosAtivos}/{modulos.length} módulos</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cliente.status !== "ATIVO" && <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => atualizarStatus("ATIVO")}>✓ Ativar</button>}
          {cliente.status === "ATIVO" && <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => atualizarStatus("SUSPENSO")}>Suspender</button>}
          {cliente.status !== "INATIVO" && <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => atualizarStatus("INATIVO")}>Inativar</button>}
        </div>
      </div>

      {/* Resumo financeiro rápido */}
      {resumo && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <MiniCard icon={<FiClock size={13} />} label="Pendente" value={`R$ ${Number(resumo.pendentes._sum.valor || 0).toFixed(2)}`} sub={`${resumo.pendentes._count} fatura(s)`} color="var(--warning)" />
          <MiniCard icon={<FiCheck size={13} />} label="Pago" value={`R$ ${Number(resumo.pagas._sum.valor || 0).toFixed(2)}`} sub={`${resumo.pagas._count} fatura(s)`} color="var(--success)" />
          <MiniCard icon={<FiAlertCircle size={13} />} label="Atrasado" value={`R$ ${Number(resumo.atrasadas._sum.valor || 0).toFixed(2)}`} sub={`${resumo.atrasadas._count} fatura(s)`} color="var(--danger)" />
          {contrato && <MiniCard icon={<FiDollarSign size={13} />} label="Mensalidade" value={`R$ ${Number(contrato.valorMensal).toFixed(2)}`} sub={`Vence dia ${contrato.diaVencimento}`} color="var(--purple)" />}
        </div>
      )}

      {/* Tabs */}
      <div className="adm-tabs">
        {ABAS.map(a => (
          <button key={a.key} className={`adm-tab ${aba === a.key ? "active" : ""}`} onClick={() => setAba(a.key)}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{a.icon} {a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Aba Geral ── */}
      {aba === "geral" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <InfoCard title="Empresa">
            <InfoRow label="Razão Social" value={empresa?.razaoSocial} />
            <InfoRow label="Nome Fantasia" value={empresa?.nomeFantasia || "—"} />
            <InfoRow label="CNPJ" value={empresa?.cnpj ? empresa.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : "—"} />
          </InfoCard>
          <InfoCard title="Tenant / Plataforma">
            <InfoRow label="ID" value={`#${cliente.id}`} />
            <InfoRow label="Subdomínio" value={cliente.subdominio} />
            <InfoRow label="Origem" value={cliente.origem} />
            <InfoRow label="Total de usuários" value={cliente._count?.usuarios ?? 0} />
            <InfoRow label="Cadastro" value={new Date(cliente.criadoEm).toLocaleDateString("pt-BR")} />
          </InfoCard>
        </div>
      )}

      {/* ── Aba Módulos ── */}
      {aba === "modulos" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              <strong style={{ color: "#fff" }}>{modulosAtivos}</strong> de {modulos.length} módulos ativos
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => toggleTodosModulos(false)}>
                <FiX size={12} /> Desativar todos
              </button>
              <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => toggleTodosModulos(true)}>
                <FiCheck size={12} /> Ativar todos
              </button>
            </div>
          </div>
          <div className="adm-modulos-grid">
            {modulos.map((m: any) => (
              <div key={m.id} className="adm-modulo-item" style={{ borderColor: m.ativo ? "rgba(124,58,237,0.3)" : "var(--border)" }}>
                <div>
                  <div className="adm-modulo-nome">{m.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{m.descricao}</div>
                </div>
                <label className="adm-toggle">
                  <input type="checkbox" checked={m.ativo} onChange={e => toggleModulo(m.id, e.target.checked)} />
                  <span className="adm-toggle-slider" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Aba Contrato ── */}
      {aba === "contrato" && (
        <div>
          {cliente.contratos?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              {cliente.contratos.map((c: any) => (
                <div key={c.id} className="adm-card" style={{ borderColor: c.status === "ATIVO" ? "rgba(124,58,237,0.3)" : "var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{c.plano?.nome}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Contrato #{c.id}</div>
                    </div>
                    <span className={`adm-badge ${c.status === "ATIVO" ? "adm-badge-green" : "adm-badge-gray"}`}>{c.status}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 14 }}>
                    <InfoRow label="Valor mensal" value={`R$ ${Number(c.valorMensal).toFixed(2)}`} />
                    <InfoRow label="Dia vencimento" value={`Dia ${c.diaVencimento}`} />
                    <InfoRow label="Início" value={new Date(c.dataInicio).toLocaleDateString("pt-BR")} />
                    {c.dataFim && <InfoRow label="Fim" value={new Date(c.dataFim).toLocaleDateString("pt-BR")} />}
                  </div>
                  {c.observacoes && <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>{c.observacoes}</div>}
                  <div style={{ display: "flex", gap: 10 }}>
                    {c.urlContratoPdf && (
                      <a href={c.urlContratoPdf} target="_blank" rel="noreferrer" className="adm-btn adm-btn-ghost adm-btn-sm">
                        📄 Ver PDF do contrato
                      </a>
                    )}
                    <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => { setFaturaForm(f => ({ ...f, contratoId: String(c.id), valor: String(c.valorMensal) })); setShowFatura(true); setAba("faturas"); }}>
                      + Gerar fatura
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="adm-empty" style={{ marginBottom: 20 }}>Nenhum contrato cadastrado.</div>
          )}
          <button className="adm-btn adm-btn-primary" onClick={() => setShowContrato(true)}>+ Novo contrato</button>
        </div>
      )}

      {/* ── Aba Faturas ── */}
      {aba === "faturas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button className="adm-btn adm-btn-primary" onClick={() => setShowFatura(true)} disabled={!contrato}>
              + Gerar fatura
            </button>
          </div>
          {!contrato && <div style={{ color: "var(--warning)", fontSize: 13, marginBottom: 16 }}>⚠ Cadastre um contrato antes de gerar faturas.</div>}
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Pago em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {faturas.map((f: any) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600, color: "#fff" }}>{f.competencia}</td>
                    <td>R$ {Number(f.valor).toFixed(2)}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(f.vencimento).toLocaleDateString("pt-BR")}</td>
                    <td><span className={`adm-badge ${STATUS_FATURA_CLS[f.status]}`}>{f.status}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{f.pagoEm ? new Date(f.pagoEm).toLocaleDateString("pt-BR") : "—"}</td>
                    <td>
                      {f.status === "PENDENTE" || f.status === "ATRASADA" ? (
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => marcarPaga(f.id)}>
                          <FiCheck size={12} /> Marcar paga
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {faturas.length === 0 && <tr><td colSpan={6} className="adm-empty">Nenhuma fatura gerada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Aba Admins ── */}
      {aba === "admins" && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Status</th><th>Cadastro</th><th></th></tr>
            </thead>
            <tbody>
              {(cliente.usuarios ?? []).map((u: any) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: "#fff" }}>{u.nome}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.email}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.telefone || "—"}</td>
                  <td>{u.ativo ? <span className="adm-badge adm-badge-green">Ativo</span> : <span className="adm-badge adm-badge-gray">Inativo</span>}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(u.criadoEm).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <button className={`adm-btn adm-btn-sm ${u.ativo ? "adm-btn-danger" : "adm-btn-ghost"}`} onClick={() => toggleAdmin(u.id, !u.ativo)}>
                      {u.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
              {(cliente.usuarios ?? []).length === 0 && <tr><td colSpan={6} className="adm-empty">Nenhum administrador cadastrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Novo Contrato */}
      {showContrato && (
        <div className="adm-modal-overlay" onClick={() => setShowContrato(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Novo Contrato</div>
            <form onSubmit={salvarContrato} className="adm-form">
              <div className="adm-grid2">
                <div className="adm-field" style={{ gridColumn: "span 2" }}>
                  <label>Plano *</label>
                  <select value={contratoForm.planoId} onChange={e => { const p = planos.find((x: any) => String(x.id) === e.target.value); setContratoForm(f => ({ ...f, planoId: e.target.value, valorMensal: p ? String(p.precoMensal) : f.valorMensal })); }} required>
                    <option value="">Selecione o plano...</option>
                    {planos.map((p: any) => <option key={p.id} value={p.id}>{p.nome} — R$ {Number(p.precoMensal).toFixed(2)}</option>)}
                  </select>
                </div>
                <div className="adm-field">
                  <label>Valor mensal (R$) *</label>
                  <input type="number" step="0.01" min="0" value={contratoForm.valorMensal} onChange={e => setContratoForm(f => ({ ...f, valorMensal: e.target.value }))} required />
                </div>
                <div className="adm-field">
                  <label>Dia de vencimento</label>
                  <input type="number" min="1" max="28" value={contratoForm.diaVencimento} onChange={e => setContratoForm(f => ({ ...f, diaVencimento: e.target.value }))} />
                </div>
                <div className="adm-field">
                  <label>Data início *</label>
                  <input type="date" value={contratoForm.dataInicio} onChange={e => setContratoForm(f => ({ ...f, dataInicio: e.target.value }))} required />
                </div>
                <div className="adm-field">
                  <label>URL do contrato (PDF)</label>
                  <input type="url" placeholder="https://drive.google.com/..." value={contratoForm.urlContratoPdf} onChange={e => setContratoForm(f => ({ ...f, urlContratoPdf: e.target.value }))} />
                </div>
              </div>
              <div className="adm-field">
                <label>Observações</label>
                <textarea rows={3} value={contratoForm.observacoes} onChange={e => setContratoForm(f => ({ ...f, observacoes: e.target.value }))} style={{ resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setShowContrato(false)}>Cancelar</button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
                  {saving ? <span className="adm-spinner" /> : "Salvar contrato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerar Fatura */}
      {showFatura && (
        <div className="adm-modal-overlay" onClick={() => setShowFatura(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Gerar Fatura</div>
            <form onSubmit={gerarFatura} className="adm-form">
              <div className="adm-field">
                <label>Contrato *</label>
                <select value={faturaForm.contratoId} onChange={e => { const c = cliente.contratos?.find((x: any) => String(x.id) === e.target.value); setFaturaForm(f => ({ ...f, contratoId: e.target.value, valor: c ? String(c.valorMensal) : f.valor })); }} required>
                  <option value="">Selecione...</option>
                  {(cliente.contratos ?? []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.plano?.nome} — R$ {Number(c.valorMensal).toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div className="adm-grid2">
                <div className="adm-field">
                  <label>Competência * (AAAA-MM)</label>
                  <input type="month" value={faturaForm.competencia} onChange={e => setFaturaForm(f => ({ ...f, competencia: e.target.value }))} required />
                </div>
                <div className="adm-field">
                  <label>Vencimento *</label>
                  <input type="date" value={faturaForm.vencimento} onChange={e => setFaturaForm(f => ({ ...f, vencimento: e.target.value }))} required />
                </div>
                <div className="adm-field">
                  <label>Valor (R$)</label>
                  <input type="number" step="0.01" min="0" value={faturaForm.valor} onChange={e => setFaturaForm(f => ({ ...f, valor: e.target.value }))} placeholder="Deixe vazio para usar valor do contrato" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setShowFatura(false)}>Cancelar</button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
                  {saving ? <span className="adm-spinner" /> : "Gerar fatura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="adm-card" style={{ flex: 1, minWidth: 150 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 4, fontSize: 12, fontWeight: 600 }}>{icon} {label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="adm-card">
      <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text)" }}>{value ?? "—"}</div>
    </div>
  );
}
