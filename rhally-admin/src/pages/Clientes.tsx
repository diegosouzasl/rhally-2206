import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { StatusBadge, OrigemBadge } from "./Dashboard";

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);
    if (filtroStatus) params.set("status", filtroStatus);
    api.get(`/clientes?${params}`).then(setClientes).catch(() => {});
  }, [busca, filtroStatus]);

  return (
    <div className="adm-page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Clientes</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{clientes.length} cliente(s) encontrado(s)</p>
      </div>

      <div className="adm-toolbar">
        <input className="adm-search" placeholder="Buscar por nome, empresa ou CNPJ..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}
          value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
          <option value="SUSPENSO">Suspenso</option>
        </select>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>CNPJ</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Plano</th>
              <th>Usuários</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c: any) => (
              <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/clientes/${c.id}`)}>
                <td>
                  <div style={{ fontWeight: 600, color: "#fff" }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.subdominio}</div>
                </td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>{c.empresas?.[0]?.cnpj || "—"}</td>
                <td><OrigemBadge origem={c.origem} /></td>
                <td><StatusBadge status={c.status} /></td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{c.contratos?.[0]?.plano?.nome || "—"}</td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{c._count?.usuarios ?? 0}</td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(c.criadoEm).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {clientes.length === 0 && <tr><td colSpan={7} className="adm-empty">Nenhum cliente encontrado</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
