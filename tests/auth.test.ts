import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { Client, PASSWORD, createPropertyWithRoom, pool, signUpOwner } from "./helpers";

async function waitForEmailLink(logSpy: ReturnType<typeof mock.method>, path: string) {
  for (let i = 0; i < 50; i++) {
    for (const call of logSpy.mock.calls) {
      const match = String(call.arguments[0]).match(new RegExp(`${path}\\?token=([\\w-]+)`));
      if (match) return decodeURIComponent(match[1]);
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`no ${path} link logged`);
}

describe("authentication", () => {
  it("requires email confirmation before login", async (t) => {
    const logSpy = t.mock.method(console, "log", () => {});
    const client = new Client();
    const email = "new@example.test";

    assert.equal((await client.post("/api/auth/signup", { email, password: PASSWORD, fullName: "New" })).status, 201);
    const blocked = await client.post("/api/auth/login", { email, password: PASSWORD });
    assert.equal(blocked.status, 403);

    const token = await waitForEmailLink(logSpy, "/verify-email");
    const verified = await client.post("/api/auth/verify-email", { token });
    assert.equal(verified.status, 200);
    assert.equal((await client.get("/api/auth/me")).body.email, email);

    assert.equal((await client.post("/api/auth/verify-email", { token })).status, 400, "tokens are single-use");
  });

  it("rejects a wrong password without revealing whether the account exists", async () => {
    await signUpOwner("owner@example.test");
    const wrong = await new Client().post("/api/auth/login", { email: "owner@example.test", password: "nope-nope-nope" });
    const missing = await new Client().post("/api/auth/login", { email: "ghost@example.test", password: "nope-nope-nope" });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.body, missing.body);
  });

  it("resets the password and logs out other sessions", async (t) => {
    const logSpy = t.mock.method(console, "log", () => {});
    const owner = await signUpOwner("owner@example.test");
    await new Client().post("/api/auth/forgot-password", { email: "owner@example.test" });
    const token = await waitForEmailLink(logSpy, "/reset-password");

    const reset = await new Client().post("/api/auth/reset-password", { token, password: "a-brand-new-password" });
    assert.equal(reset.status, 200);
    assert.equal((await owner.get("/api/properties")).status, 401, "old session is revoked");
    const login = await new Client().post("/api/auth/login", { email: "owner@example.test", password: "a-brand-new-password" });
    assert.equal(login.status, 200);
  });

  it("blocks the API without a session", async () => {
    for (const path of ["/api/properties", "/api/rooms", "/api/bookings", "/api/events"]) {
      assert.equal((await new Client().get(path)).status, 401, path);
    }
  });

  it("keeps each owner's data private", async () => {
    const alice = await signUpOwner("alice@example.test");
    const bob = await signUpOwner("bob@example.test");
    const { property, room } = await createPropertyWithRoom(alice);

    assert.deepEqual((await bob.get("/api/properties")).body, []);
    assert.deepEqual((await bob.get("/api/rooms")).body, []);
    assert.equal((await bob.patch(`/api/properties/${property.id}`, { name: "Mine now" })).status, 404);
    assert.equal((await bob.delete(`/api/rooms/${room.id}`)).status, 404);
    assert.equal(
      (await bob.post("/api/rooms", { propertyId: property.id, name: "Intruder", maxGuests: 1, pricePerNight: "1" })).status,
      404,
    );
  });

  it("ignores an ownerId sent by the client", async () => {
    const alice = await signUpOwner("alice@example.test");
    const bob = await signUpOwner("bob@example.test");
    const { rows } = await pool.query("SELECT id FROM users WHERE email = 'bob@example.test'");
    const created = await alice.post("/api/properties", { name: "Casa", city: "Roma", ownerId: rows[0].id });
    assert.equal(created.status, 201);
    assert.equal((await bob.get("/api/properties")).body.length, 0);
    assert.equal((await alice.get("/api/properties")).body.length, 1);
  });
});
