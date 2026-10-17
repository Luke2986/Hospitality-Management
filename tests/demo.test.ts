import "./env";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Client, PASSWORD, pool } from "./helpers";

// Read when the app is created, in the helpers' before() hook.
process.env.DEMO_MODE = "true";
process.env.CRON_SECRET = "test-cron-secret";
process.env.RESEND_API_KEY = "re_must_not_be_used";

async function demoVisitor() {
  const client = new Client();
  const login = await client.post("/api/demo/login");
  assert.equal(login.status, 201);
  return client;
}

describe("demo mode", () => {
  it("tells the client it is a demo", async () => {
    assert.deepEqual((await new Client().get("/api/config")).body, { demo: true });
  });

  it("gives every visitor their own account full of sample data", async () => {
    const visitor = await demoVisitor();
    const me = await visitor.get("/api/auth/me");
    assert.match(me.body.email, /^demo-[0-9a-f]+@hospitality-demo\.example$/);

    const properties = await visitor.get("/api/properties");
    assert.deepEqual(properties.body.map((p: any) => p.name).sort(), ["Agriturismo Poggio ai Lecci", "B&B Il Glicine"]);
    assert.equal((await visitor.get("/api/rooms")).body.length, 6);

    const bookings = await visitor.get("/api/bookings?limit=100");
    const total = Number(bookings.headers.get("x-total-count"));
    assert.ok(total >= 30, `expected at least 30 bookings, got ${total}`);
    const statuses = bookings.body.map((b: any) => b.status as string);
    assert.deepEqual(Array.from(new Set(statuses)).sort(), ["cancelled", "confirmed", "pending"]);

    const summary = await visitor.get(`/api/dashboard/summary?today=${new Date().toISOString().slice(0, 10)}`);
    assert.equal(summary.status, 200);
    assert.ok(Number((await visitor.get("/api/events?limit=1")).headers.get("x-total-count")) >= 20);

    const privacy = await visitor.get("/api/account/privacy");
    assert.equal(privacy.body.privacyContactEmail, "privacy@ilglicine.example");

    const other = await demoVisitor();
    const otherIds = (await other.get("/api/properties")).body.map((p: any) => p.id);
    assert.equal(otherIds.some((id: string) => properties.body.some((p: any) => p.id === id)), false);
  });

  it("keeps sample stays from overlapping in the same room", async () => {
    await demoVisitor();
    const { rows } = await pool.query(`
      SELECT count(*)::int AS overlaps FROM bookings a JOIN bookings b
        ON a.room_id = b.room_id AND a.id < b.id
       AND a.status <> 'cancelled' AND b.status <> 'cancelled'
       AND a.check_in < b.check_out AND b.check_in < a.check_out`);
    assert.equal(rows[0].overlaps, 0);
  });

  it("switches off account flows that need a real inbox", async () => {
    const client = new Client();
    for (const path of ["/api/auth/signup", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/resend-verification"]) {
      const res = await client.post(path, { email: "someone@example.test", password: PASSWORD, fullName: "Someone" });
      assert.equal(res.status, 403, path);
    }
  });

  it("never emails anyone, even with an email provider configured", async (t) => {
    const fetchSpy = t.mock.method(globalThis, "fetch");
    const visitor = await demoVisitor();
    const rooms = (await visitor.get("/api/rooms")).body;
    const guest = new Client();
    const booking = await guest.post("/api/widget/bookings", {
      roomId: rooms[0].id,
      guestName: "Real Person",
      guestEmail: "real.person@example.test",
      checkIn: "2031-03-01",
      checkOut: "2031-03-03",
      guestsCount: 1,
    });
    assert.equal(booking.status, 201);
    await new Promise((r) => setTimeout(r, 200));
    const toResend = fetchSpy.mock.calls.filter((call) => String(call.arguments[0]).includes("resend.com"));
    assert.equal(toResend.length, 0);
  });

  it("removes demo accounts older than a day from the daily cron", async () => {
    const old = await demoVisitor();
    const oldEmail = (await old.get("/api/auth/me")).body.email;
    await pool.query("UPDATE users SET created_at = now() - interval '25 hours' WHERE email = $1", [oldEmail]);
    const fresh = await demoVisitor();

    assert.equal((await new Client().get("/api/cron/daily")).status, 401);
    const wrong = await new Client().request("GET", "/api/cron/daily", undefined, { Authorization: "Bearer nope" });
    assert.equal(wrong.status, 401);

    const run = await new Client().request("GET", "/api/cron/daily", undefined, {
      Authorization: "Bearer test-cron-secret",
    });
    assert.equal(run.status, 200);
    assert.equal(run.body.removedDemoAccounts, 1);

    assert.equal((await old.get("/api/auth/me")).status, 401);
    assert.equal((await fresh.get("/api/auth/me")).status, 200);
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM properties");
    assert.equal(rows[0].n, 2);
  });

  it("limits how many demo accounts one address can create", async () => {
    for (let i = 0; i < 10; i++) await demoVisitor();
    assert.equal((await new Client().post("/api/demo/login")).status, 429);
  });
});

