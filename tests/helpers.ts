// Must stay the first import: it points the app at the test database before any server module loads.
import "./env";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, beforeEach, mock } from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "../server/db";
import { createApp } from "../server/app";

// Request logs and unsent-email notices would bury the test report. Without RESEND_API_KEY emails are logged,
// which is how the tests read them.
const consoleLog = mock.method(console, "log", () => {});

let server: Server;
export let baseUrl = "";

before(async () => {
  await migrate(drizzle(pool), { migrationsFolder: "migrations" });
  const created = await createApp();
  server = created.server;
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(async () => {
  consoleLog.mock.resetCalls();
  await pool.query(
    "TRUNCATE users, properties, rooms, bookings, events, auth_tokens, rate_limits RESTART IDENTITY CASCADE",
  );
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

export { pool };

export type ApiResponse<T = any> = { status: number; body: T; headers: Headers };

// A browser-like client: keeps its session cookie and sends a same-origin Origin header.
export class Client {
  cookie = "";

  async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<ApiResponse<T>> {
    const res = await fetch(baseUrl + path, {
      method,
      headers: {
        Origin: baseUrl,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    const text = await res.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {}
    return { status: res.status, body: parsed, headers: res.headers };
  }

  get<T = any>(path: string) {
    return this.request<T>("GET", path);
  }
  post<T = any>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body ?? {});
  }
  patch<T = any>(path: string, body: unknown) {
    return this.request<T>("PATCH", path, body);
  }
  delete<T = any>(path: string) {
    return this.request<T>("DELETE", path);
  }
}

export const PASSWORD = "correct-horse-battery";

export async function signUpOwner(email = "owner@example.test") {
  const client = new Client();
  const signup = await client.post("/api/auth/signup", { email, password: PASSWORD, fullName: "Owner" });
  if (signup.status !== 201) throw new Error(`signup failed: ${signup.status} ${JSON.stringify(signup.body)}`);
  await pool.query("UPDATE users SET email_verified_at = now() WHERE email = $1", [email]);
  const login = await client.post("/api/auth/login", { email, password: PASSWORD });
  if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
  return client;
}

export async function createPropertyWithRoom(owner: Client, room: Record<string, unknown> = {}) {
  const property = await owner.post("/api/properties", { name: "Casa Test", city: "Siena" });
  const created = await owner.post("/api/rooms", {
    propertyId: property.body.id,
    name: "Camera 1",
    maxGuests: 2,
    pricePerNight: "80.00",
    ...room,
  });
  return { property: property.body, room: created.body };
}

export function guestBooking(roomId: string, overrides: Record<string, unknown> = {}) {
  return {
    roomId,
    guestName: "Mario Rossi",
    guestEmail: "mario@example.test",
    checkIn: "2030-05-01",
    checkOut: "2030-05-04",
    guestsCount: 2,
    ...overrides,
  };
}

export type SentEmail = { to: string; subject: string; text: string };

export function clearEmails() {
  consoleLog.mock.resetCalls();
}

export function sentEmails(): SentEmail[] {
  return consoleLog.mock.calls.flatMap((call) => {
    const match = String(call.arguments[0]).match(/Email not sent \(RESEND_API_KEY missing\)\. To: (\S+) \| ([^\n]+)\n([\s\S]*)/);
    return match ? [{ to: match[1], subject: match[2], text: match[3] }] : [];
  });
}

// Emails go out in the background, after the response.
export async function waitForEmails(count: number) {
  for (let i = 0; i < 100 && sentEmails().length < count; i++) {
    await new Promise((r) => setTimeout(r, 20));
  }
  await new Promise((r) => setTimeout(r, 100));
  return sentEmails();
}
