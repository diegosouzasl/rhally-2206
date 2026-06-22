import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface Stats { total: number; trials: number; ativos: number; inativos: number; }
interface ModuloUso { nome: string; total: number; }
interface ClienteUso { tenantId: number; nome: string; modulos: ModuloUso[]; totalUso: number; }
interface ModulosData { globalRanking: ModuloUso[]; porCliente: ClienteUso[]; }

const MOD_COLORS: Record<string, string> = {
  Produtividade: "#6366f1",
  People: "#10b981",
  Talent: "#f59e0b",
  Safety: "#ef4444",
  Remuneração: "#3b82f6",
  Cultura: "#ec4899",
  Compliance: "#8b5cf6",
  Benefícios: "#14b8a6",
  Intelligence: "#f97316",
  Academy: "#a78bfa",
  HUB: "#22c55e",
  Marketplace: "#fb923c",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [modulos, setModulos] = useState<ModulosData | null>(null);
  const [loadingMod, setLoadingMod] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/stats").then(setStats).catch(() => {});
    api.get("/clientes").then(setClientes).catch(() => {});
    api.get("/stats/modulos-uso")
      .then(setModulos)
      .catch(() => {})
      .finally(() => setLoadingMod(false));
  }, []);

  const recentes = clientes.slice(0, 5);
  const maxGlobal = modulos?.globalRanking[0]?.total ?? 1;

  return (
    <div className="adm-page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Dashboard</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Visão geral da plataforma Rhally</p>
      </div>

      <div className="adm-stats-grid">
        <StatCard title="Total de clientes" value={stats?.total ?? "—"} icon="🏢" />
        <StatCard title="Trials ativos" value={stats?.trials ?? "—"} icon="🧪" color="var(--warning)" />
        <StatCard title="Contas ativas" value={stats?.ativos ?? "—"} icon="✅" color="var(--success)" />
        <StatCard title="Inativas" value={stats?.inativos ?? "—"} icon="⛔" color="var(--danger)" />
      </div>

      {/* Módulos mais usados */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Global ranking */}
        <div className="adm-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 16 }}>
            Módulos mais usados
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 8 }}>todos os clientes</span>
          </div>
          {loadingMod ? (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</div>
          ) : modulos?.globalRanking.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Sem dados ainda</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {modulos?.globalRanking.map((m) => (
                <div key={m.nome}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "#fff", fontWeight: 600 }}>{m.nome}</span>
                    <span style={{ color: "var(--muted)" }}>{m.total.toLocaleString("pt-BR")} registros</span>
                  </div>
                  <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.round((m.total / maxGlobal) * 100)}%`,
                      background: MOD_COLORS[m.nome] ?? "var(--primary)",
                      borderRadius: 3,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top clients by usage */}
        <div className="adm-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 16 }}>
            Clientes mais ativos
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 8 }}>por total de uso</span>
          </div>
          {loadingMod ? (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</div>
          ) : modulos?.porCliente.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Sem dados ainda</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {modulos?.porCliente.slice(0, 6).map((c) => (
                <div key={c.tenantId} style={{ cursor: "pointer" }} onClick={() => navigate(`/clientes/${c.tenantId}`)}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{c.nome}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{c.totalUso.toLocaleString("pt-BR")}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {c.modulos.slice(0, 4).map((m) => (
                      <span key={m.nome} style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: (MOD_COLORS[m.nome] ?? "#6366f1") + "22",
                        color: MOD_COLORS[m.nome] ?? "#6366f1",
                        fontWeight: 600,
                        border: `1px solid ${(MOD_COLORS[m.nome] ?? "#6366f1")}44`,
                      }}>
                        {m.nome}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-section-head">
        <h2>Clientes recentes</h2>
        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => navigate("/clientes")}>Ver todos →</button>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {recentes.map((c: any) => (
              <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/clientes/${c.id}`)}>
                <td>
                  <div style={{ fontWeight: 600, color: "#fff" }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.empresas?.[0]?.cnpj}</div>
                </td>
                <td><OrigemBadge origem={c.origem} /></td>
                <td><StatusBadge status={c.status} /></td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(c.criadoEm).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {recentes.length === 0 && <tr><td colSpan={4} className="adm-empty">Nenhum cliente ainda</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: any; icon: string; color?: string }) {
  return (
    <div className="adm-card">
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div className="adm-card-title">{title}</div>
      <div className="adm-card-value" style={color ? { color } : {}}>{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: any = { ATIVO: ["adm-badge-green", "Ativo"], INATIVO: ["adm-badge-gray", "Inativo"], SUSPENSO: ["adm-badge-red", "Suspenso"] };
  const [cls, label] = map[status] ?? ["adm-badge-gray", status];
  return <span className={`adm-badge ${cls}`}>{label}</span>;
}

export function OrigemBadge({ origem }: { origem: string }) {
  const map: any = { TRIAL: ["adm-badge-yellow", "Trial"], CONTRATO: ["adm-badge-purple", "Contrato"], MANUAL: ["adm-badge-gray", "Manual"] };
  const [cls, label] = map[origem] ?? ["adm-badge-gray", origem];
  return <span className={`adm-badge ${cls}`}>{label}</span>;
}
