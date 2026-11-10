import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Outgoing email goes through an SMTP server (e.g. Purelymail, Brevo, SES),
// configured with environment variables. See README "Email".

export type EmailConfig = {
  host: string;
  port: number;
  /** TLS from the start (port 465). Otherwise STARTTLS is required. */
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  replyTo: string;
};

const REQUIRED = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"] as const;

const env = (name: string) => process.env[name]?.trim() ?? "";

/** Env vars that still need setting before email can be sent (empty when ready). */
export function missingEmailSettings(): string[] {
  return REQUIRED.filter((name) => !env(name));
}

/** The current settings, or null when email isn't configured. */
export function emailConfig(): EmailConfig | null {
  if (missingEmailSettings().length) return null;
  const port = Number.parseInt(env("SMTP_PORT"), 10) || 587;
  const secure = env("SMTP_SECURE") ? env("SMTP_SECURE") === "true" : port === 465;
  return {
    host: env("SMTP_HOST"),
    port,
    secure,
    user: env("SMTP_USER"),
    pass: env("SMTP_PASS"),
    from: env("EMAIL_FROM"),
    replyTo: env("EMAIL_REPLY_TO"),
  };
}

export const emailConfigured = () => emailConfig() !== null;

let cached: { key: string; transporter: Transporter } | undefined;

function transporter(cfg: EmailConfig) {
  const key = JSON.stringify(cfg);
  if (cached?.key !== key) {
    cached = {
      key,
      transporter: nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        requireTLS: !cfg.secure, // never send the password unencrypted
        auth: { user: cfg.user, pass: cfg.pass },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
      }),
    };
  }
  return cached.transporter;
}

function requireConfig() {
  const cfg = emailConfig();
  if (!cfg) throw new Error(`Email isn't set up. Missing: ${missingEmailSettings().join(", ")}.`);
  return cfg;
}

export type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

/** Send one email. Throws if email isn't configured or the server refuses it. */
export async function sendEmail(msg: EmailMessage) {
  const cfg = requireConfig();
  const info = await transporter(cfg).sendMail({
    from: cfg.from,
    replyTo: msg.replyTo || cfg.replyTo || undefined,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
  return { messageId: info.messageId };
}

/** Connect and log in to the SMTP server without sending anything. */
export async function verifyEmailConnection() {
  await transporter(requireConfig()).verify();
}
