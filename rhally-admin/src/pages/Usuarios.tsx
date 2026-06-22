import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../lib/api";

const ROLES = ["SUPER", "COMERCIAL", "SUPORTE"];
const ROLE_LABEL: any = { SUPER: "Super Admin", COMERCIAL: "Comercial", SUPORTE: "Suporte" };
const ROLE_CLS: any = { SUPER: "adm-badge-purple", COMERCIAL: "adm-badge-yellow", SUPORTE: "adm-badge-gray" };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", role: "SUPORTE" });
  const [saving, setSaving] = useState(false);

  function load() { api.get("/usuarios").then(setUsuarios).catch(() => {}); }
  useEffect(() => { load(); }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/usuarios", form);
      toast.success("Usuário criado!");
      setShowModal(false);
      setForm({ nome: "", email: "", senha: "", role: "SUPORTE" });
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function toggleAtivo(u: any) {
    try {
      await api.patch(`/usuarios/${u.id}`, { ativo: !u.ativo });
      load();
    } catch { toast.error("Erro ao atualizar"); }
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este usuário?")) return;
    try {
      await api.delete(`/usuarios/${id}`);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="adm-page">
      <div className="adm-section-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Equipe Rhally</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Usuários com acesso ao painel admin</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => setShowModal(true)}>+ Novo usuário</button>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Cadastro</th><th></th></tr>
          </thead>
          <tbody>
            {usuarios.map((u: any) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600, color: "#fff" }}>{u.nome}</td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.email}</td>
                <td><span className={`adm-badge ${ROLE_CLS[u.role]}`}>{ROLE_LABEL[u.role]}</span></td>
                <td>{u.ativo ? <span className="adm-badge adm-badge-green">Ativo</span> : <span className="adm-badge adm-badge-gray">Inativo</span>}</td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(u.criadoEm).toLocaleDateString("pt-BR")}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => toggleAtivo(u)}>
                    {u.ativo ? "Desativar" : "Ativar"}
                  </button>
                  <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => excluir(u.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && <tr><td colSpan={6} className="adm-empty">Nenhum usuário interno cadastrado</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="adm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Novo usuário interno</div>
            <form onSubmit={criar} className="adm-form">
              <div className="adm-field">
                <label>Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
              </div>
              <div className="adm-field">
                <label>E-mail *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="adm-grid2">
                <div className="adm-field">
                  <label>Senha *</label>
                  <input type="password" minLength={8} value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} required placeholder="Mínimo 8 chars" />
                </div>
                <div className="adm-field">
                  <label>Perfil</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
                  {saving ? <span className="adm-spinner" /> : "Criar usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
