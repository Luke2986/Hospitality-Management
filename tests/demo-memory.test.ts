import { after, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

// The demo without a database server: no DATABASE_URL, so the app runs on an in-memory PGlite database.
// No shared helpers here: they point the app at TEST_DATABASE_URL.
process.env.NODE_ENV = "test";
process.env.DEMO_MODE = "true";
process.env.SESSION_SECRET = "test-session-secret";
delete process.env.DATABASE_URL;
delete process.env.RESEND_API_KEY;
delete process.env.CRON_SECRET;
mock.method(console, "log", () => {});

let server: Server;
let baseUrl = "";
let pool: typeof import("../server/db").pool;

before(async () => {
  const db = await import("../server/db");
  assert.equal(db.isInMemory, true);
  pool = db.pool;
  const { createApp } = await import("../server/app");
  server = (await createApp()).server;
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

// cookie-session sets the session and its signature as two cookies.
class Visitor {
  cookies = new Map<string, string>();

  async request(method: string, path: string) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: { Origin: baseUrl, Cookie: Array.from(this.cookies, ([k, v]) => `${k}=${v}`).join("; ") },
    });
    for (const header of res.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const eq = pair.indexOf("=");
      this.cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  }
}

describe("demo without a database server", () => {
  it("keeps a visitor's account when their next request reaches an instance that has never seen them", async () => {
    const visitor = new Visitor();
    assert.equal((await visitor.request("POST", "/api/demo/login")).status, 201);
    const before = (await visitor.request("GET", "/api/properties")).body;
    assert.equal(before.length, 2);
    const bookings = await visitor.request("GET", "/api/bookings?limit=5");

    // A fresh serverless instance starts with an empty database.
    await pool.query("DELETE FROM users");

    const after = (await visitor.request("GET", "/api/properties")).body;
    assert.deepEqual(after.map((p: any) => p.id).sort(), before.map((p: any) => p.id).sort());
    const ids = (list: any[]) => list.map((b) => `${b.id} ${b.checkIn} ${b.status}`);
    assert.deepEqual(ids((await visitor.request("GET", "/api/bookings?limit=5")).body), ids(bookings.body));

    await pool.query("DELETE FROM users");
    const widget = await visitor.request("GET", `/api/widget/properties/${before[0].id}`);
    assert.equal(widget.status, 200);
  });

  it("gives each visitor separate data and signs them out on logout", async () => {
    const first = new Visitor();
    const second = new Visitor();
    await first.request("POST", "/api/demo/login");
    await second.request("POST", "/api/demo/login");
    const firstIds = (await first.request("GET", "/api/properties")).body.map((p: any) => p.id);
    const secondIds = (await second.request("GET", "/api/properties")).body.map((p: any) => p.id);
    assert.equal(firstIds.some((id: string) => secondIds.includes(id)), false);

    assert.equal((await first.request("POST", "/api/auth/logout")).status, 204);
    assert.equal((await first.request("GET", "/api/auth/me")).status, 401);
  });

  it("rejects a session cookie that was not signed by the server", async () => {
    const forger = new Visitor();
    const forged = Buffer.from(JSON.stringify({ passport: { user: "00000000-0000-4000-a000-000000000000" } })).toString("base64");
    forger.cookies.set("hm.sid", forged);
    assert.equal((await forger.request("GET", "/api/auth/me")).status, 401);
  });
});
