const siteKey = process.env.TURNSTILE_SITE_KEY || null;
const secretKey = process.env.TURNSTILE_SECRET_KEY || null;

if (!siteKey !== !secretKey) {
  throw new Error("Set both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, or neither");
}

export function turnstileSiteKey() {
  return siteKey;
}

export async function verifyTurnstile(token: unknown, remoteIp?: string): Promise<boolean> {
  if (!secretKey) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!res.ok) {
    throw new Error(`Turnstile siteverify returned ${res.status}`);
  }
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
