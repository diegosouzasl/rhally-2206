import nodemailer from "nodemailer";
import { env } from "../config/env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!env.smtpHost) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return transporter;
}

/**
 * Envia um e-mail. Se SMTP não estiver configurado (dev), apenas loga o conteúdo
 * no console — assim o fluxo continua funcionando sem servidor de e-mail.
 */
export async function enviarEmail(to: string, subject: string, html: string) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n📧 [DEV] E-mail para ${to}\n   Assunto: ${subject}\n   ${html.replace(/<[^>]+>/g, " ").trim()}\n`);
    return { dev: true };
  }
  await t.sendMail({ from: env.smtpFrom, to, subject, html });
  return { dev: false };
}
