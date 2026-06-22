const BASE = "/api/admin-rhally";

function token() {
  return localStorage.getItem("admin_token") || "";
}

function headers() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` };
}

async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    window.location.href = "/login";
    throw new Error("Sessão expirada.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erro desconhecido");
  return data;
}

export const api = {
  get: (p: string) => req("GET", p),
  post: (p: string, b: unknown) => req("POST", p, b),
  patch: (p: string, b: unknown) => req("PATCH", p, b),
  delete: (p: string) => req("DELETE", p),
};
