import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email, senha });
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.usuario));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adm-login-page">
      <div className="adm-login-box">
        <div className="adm-login-logo">
          <img src="https://plataforma.rhally.com.br/logo-icon.png" alt="Rhally" />
        </div>

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>
          Acesso restrito — equipe Rhally
        </p>

        <form onSubmit={handleSubmit} className="adm-form">
          <div className="adm-field">
            <label>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="seu@rhally.com.br" />
          </div>
          <div className="adm-field">
            <label>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="adm-btn adm-btn-primary" disabled={loading} style={{ marginTop: 4, justifyContent: "center" }}>
            {loading ? <span className="adm-spinner" /> : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
