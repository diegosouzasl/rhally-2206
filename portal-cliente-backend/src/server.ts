import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import routes from "./routes";

const app = express();

/* ----------------- Middlewares globais ----------------- */
app.use(
  cors(
    env.corsOrigins.length
      ? { origin: env.corsOrigins, credentials: true }
      : undefined
  )
);
if (!env.corsOrigins.length) {
  console.warn("⚠️  CORS_ORIGINS não definido — CORS aberto. Defina em produção.");
}
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 240,
  })
);

/* ----------------- Healthcheck ----------------- */
app.get("/", (_req: Request, res: Response) => {
  res.json({ service: "portal-cliente-backend", status: "ok" });
});

/* ----------------- Rotas (prefixo /api) ----------------- */
app.use("/api", routes);

/* ----------------- Fallback 404 ----------------- */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint não encontrado." });
});

app.listen(env.port, env.host, () => {
  const label = env.host === "0.0.0.0" ? "localhost" : env.host;
  console.log(`✅ Portal do Cliente API rodando em http://${label}:${env.port}`);
});

export default app;
