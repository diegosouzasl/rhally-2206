import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return v;
}

export const env = {
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT) || 3337,

  databaseUrl: required("DATABASE_URL"),

  // Auth do portal
  portalJwtSecret: required("PORTAL_JWT_SECRET"),
  portalJwtExpiresIn: process.env.PORTAL_JWT_EXPIRES_IN || "8h",

  // Integração Rhally
  rhallyJwtPass: required("RHALLY_JWT_PASS"),
  rhallyApiUrl: process.env.RHALLY_API_URL || "http://localhost:4000",

  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  // Asaas (faturamento)
  asaasBaseUrl: process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3",
  asaasApiKey: process.env.ASAAS_API_KEY || "",
  asaasWebhookToken: process.env.ASAAS_WEBHOOK_TOKEN || "",

  // URL do frontend (links de e-mail, etc.)
  appUrl: process.env.APP_URL || "http://localhost:5174",

  // E-mail (SMTP) — opcional em dev (sem config, loga o link no console)
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "no-reply@rhally.com.br",

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
};
