import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { FiGrid, FiUsers, FiLogOut, FiUserCheck } from "react-icons/fi";

export default function Layout() {
  const navigate = useNavigate();
  const raw = localStorage.getItem("admin_user");
  const user = raw ? JSON.parse(raw) : null;

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/login");
  }

  return (
    <div className="adm-layout">
      <aside className="adm-sidebar">
        <div className="adm-sidebar-logo">
          <img src="https://plataforma.rhally.com.br/logo-icon.png" alt="Rhally" />
          <span className="adm-sidebar-badge">ADMIN</span>
        </div>

        <nav className="adm-nav">
          <NavLink to="/dashboard" className={({ isActive }) => "adm-nav-item" + (isActive ? " active" : "")}>
            <span className="adm-nav-icon"><FiGrid /></span> Dashboard
          </NavLink>
          <NavLink to="/clientes" className={({ isActive }) => "adm-nav-item" + (isActive ? " active" : "")}>
            <span className="adm-nav-icon"><FiUsers /></span> Clientes
          </NavLink>
          {user?.role === "SUPER" && (
            <>
              <div className="adm-nav-sep" />
              <NavLink to="/usuarios" className={({ isActive }) => "adm-nav-item" + (isActive ? " active" : "")}>
                <span className="adm-nav-icon"><FiUserCheck /></span> Equipe Rhally
              </NavLink>
            </>
          )}
        </nav>

        <div className="adm-sidebar-footer">
          <div style={{ marginBottom: 8, color: "var(--text)", fontWeight: 600, fontSize: 13 }}>{user?.nome}</div>
          <div style={{ marginBottom: 12 }}>{user?.email}</div>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={logout} style={{ width: "100%" }}>
            <FiLogOut size={13} /> Sair
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <Outlet />
      </main>
    </div>
  );
}
