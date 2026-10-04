import { log } from "./vite";

type Email = { to: string; subject: string; text: string; html: string };

const isProduction = process.env.NODE_ENV === "production";

export function assertEmailConfig() {
  if (!isProduction) return;
  const missing = ["RESEND_API_KEY", "EMAIL_FROM", "APP_URL"].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

// Links in emails must never be built from the request Host header, or a forged header would point them elsewhere.
export function appUrl(path: string) {
  const base = process.env.APP_URL || `http://localhost:${process.env.PORT || "5000"}`;
  return new URL(path, base).toString();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function sendEmail(email: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log(`Email not sent (RESEND_API_KEY missing). To: ${email.to} | ${email.subject}\n${email.text}`, "email");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, ...email }),
  });
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}

function layout(greeting: string, body: string, cta: string, link: string, footer: string) {
  const html = `<!doctype html>
<html lang="it"><body style="font-family:Arial,sans-serif;color:#1f2937;max-width:520px;margin:0 auto;padding:24px">
<p>${escapeHtml(greeting)}</p>
<p>${escapeHtml(body)}</p>
<p style="margin:28px 0"><a href="${escapeHtml(link)}" style="background:#4f7a6a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${escapeHtml(cta)}</a></p>
<p style="font-size:13px;color:#6b7280">Se il pulsante non funziona, copia questo link nel browser:<br>${escapeHtml(link)}</p>
<p style="font-size:13px;color:#6b7280">${escapeHtml(footer)}</p>
</body></html>`;
  const text = `${greeting}\n\n${body}\n\n${cta}: ${link}\n\n${footer}`;
  return { html, text };
}

export async function sendVerificationEmail(to: string, name: string | null, token: string) {
  const link = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  const { html, text } = layout(
    `Ciao ${name || ""},`.replace(" ,", ","),
    "Conferma il tuo indirizzo email per attivare il tuo account Hospitality Manager.",
    "Conferma email",
    link,
    "Il link scade tra 24 ore. Se non hai creato tu l'account, ignora questa email.",
  );
  await sendEmail({ to, subject: "Conferma il tuo indirizzo email", html, text });
}

export async function sendPasswordResetEmail(to: string, name: string | null, token: string) {
  const link = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  const { html, text } = layout(
    `Ciao ${name || ""},`.replace(" ,", ","),
    "Abbiamo ricevuto una richiesta di reimpostazione della password del tuo account.",
    "Reimposta password",
    link,
    "Il link scade tra 1 ora. Se non hai richiesto tu il cambio password, ignora questa email: la password attuale resta valida.",
  );
  await sendEmail({ to, subject: "Reimposta la tua password", html, text });
}
