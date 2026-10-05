import { log } from "./vite";
import type { Booking, Property, Room } from "@shared/schema";

type Email = { to: string; subject: string; text: string; html: string; replyTo?: string };

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
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}

// Fire-and-forget: a slow or failing provider must not delay or fail the request, and for auth emails the
// response time must not reveal whether the account exists.
export function sendInBackground(task: () => Promise<void>) {
  task().catch((err) => log(`Email delivery failed: ${err instanceof Error ? err.message : err}`, "email"));
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

type BookingEmail = { booking: Booking; property: Property; room: Room };

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

function bookingDetails({ booking, property, room }: BookingEmail) {
  return [
    ["Struttura", property.name],
    ["Camera", room.name],
    ["Check-in", formatDate(booking.checkIn)],
    ["Check-out", formatDate(booking.checkOut)],
    ["Ospiti", String(booking.guestsCount)],
    ["Totale", `€ ${booking.totalPrice}`],
  ];
}

function bookingLayout(greeting: string, intro: string, details: string[][], outro: string, cta?: { label: string; link: string }) {
  const rows = details
    .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#6b7280">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
    .join("");
  const button = cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.link)}" style="background:#4f7a6a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${escapeHtml(cta.label)}</a></p>`
    : "";
  const html = `<!doctype html>
<html lang="it"><body style="font-family:Arial,sans-serif;color:#1f2937;max-width:520px;margin:0 auto;padding:24px">
<p>${escapeHtml(greeting)}</p>
<p>${escapeHtml(intro)}</p>
<table style="border-collapse:collapse;margin:16px 0">${rows}</table>
${button}
<p style="font-size:13px;color:#6b7280">${escapeHtml(outro)}</p>
</body></html>`;
  const text = [greeting, intro, details.map(([k, v]) => `${k}: ${v}`).join("\n"), cta ? `${cta.label}: ${cta.link}` : "", outro]
    .filter(Boolean)
    .join("\n\n");
  return { html, text };
}

export async function sendBookingReceivedEmail(data: BookingEmail, ownerEmail: string) {
  const { html, text } = bookingLayout(
    `Ciao ${data.booking.guestName},`,
    `abbiamo ricevuto la tua richiesta di prenotazione presso ${data.property.name}. Riceverai un'altra email quando la struttura la confermerà.`,
    bookingDetails(data),
    "Per domande o modifiche rispondi a questa email: arriverà direttamente alla struttura.",
  );
  await sendEmail({ to: data.booking.guestEmail, subject: `Richiesta di prenotazione ricevuta – ${data.property.name}`, html, text, replyTo: ownerEmail });
}

export async function sendBookingStatusEmail(data: BookingEmail, ownerEmail: string) {
  const confirmed = data.booking.status === "confirmed";
  const { html, text } = bookingLayout(
    `Ciao ${data.booking.guestName},`,
    confirmed
      ? `la tua prenotazione presso ${data.property.name} è confermata. Ti aspettiamo!`
      : `la tua prenotazione presso ${data.property.name} è stata annullata.`,
    bookingDetails(data),
    "Per qualsiasi domanda rispondi a questa email: arriverà direttamente alla struttura.",
  );
  const subject = confirmed
    ? `Prenotazione confermata – ${data.property.name}`
    : `Prenotazione annullata – ${data.property.name}`;
  await sendEmail({ to: data.booking.guestEmail, subject, html, text, replyTo: ownerEmail });
}

export async function sendOwnerBookingEmail(data: BookingEmail, ownerEmail: string, event: "new" | "cancelled") {
  const { booking } = data;
  const details = [
    ["Ospite", booking.guestName],
    ["Email", booking.guestEmail],
    ...(booking.guestPhone ? [["Telefono", booking.guestPhone]] : []),
    ...bookingDetails(data),
    ...(booking.notes ? [["Note", booking.notes]] : []),
  ];
  const { html, text } = bookingLayout(
    "Ciao,",
    event === "new"
      ? `hai una nuova richiesta di prenotazione dal widget di ${data.property.name}. Confermala o rifiutala dalla dashboard.`
      : `l'ospite ha annullato la sua richiesta di prenotazione presso ${data.property.name}. Le date sono di nuovo libere.`,
    details,
    "Rispondi a questa email per scrivere direttamente all'ospite.",
    { label: "Apri le prenotazioni", link: appUrl("/dashboard/bookings") },
  );
  const subject = event === "new"
    ? `Nuova richiesta di prenotazione – ${data.property.name}`
    : `Prenotazione annullata dall'ospite – ${data.property.name}`;
  await sendEmail({ to: ownerEmail, subject, html, text, replyTo: booking.guestEmail });
}
