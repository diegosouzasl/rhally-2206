import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useEffect, useState } from "react";
import "react-toastify/dist/ReactToastify.css";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import Usuarios from "./pages/Usuarios";
import { api } from "./lib/api";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("admin_token");
  const [ok, setOk] = useState<boolean | null>(token ? null : false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    api.get("/auth/me")
      .then(() => setOk(true))
      .catch(() => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        navigate("/login", { replace: true });
      });
  }, []);

  if (ok === null) return <div style={{ minHeight: "100vh", background: "#0f0a1e" }} />;
  return ok ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <ToastContainer theme="dark" position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/:id" element={<ClienteDetalhe />} />
          <Route path="usuarios" element={<Usuarios />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
