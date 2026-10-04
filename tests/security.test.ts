import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Client, baseUrl, createPropertyWithRoom, signUpOwner } from "./helpers";

describe("request hardening", () => {
  it("refuses state-changing requests from another site", async () => {
    const owner = await signUpOwner();
    const fromEvil = await owner.request("POST", "/api/properties", { name: "x", city: "y" }, { Origin: "https://evil.example" });
    assert.equal(fromEvil.status, 403);
    const fetchSite = await owner.request("POST", "/api/properties", { name: "x", city: "y" }, { "Sec-Fetch-Site": "cross-site" });
    assert.equal(fetchSite.status, 403);
    const nullOrigin = await owner.request("POST", "/api/properties", { name: "x", city: "y" }, { Origin: "null" });
    assert.equal(nullOrigin.status, 403);
    assert.equal((await owner.get("/api/properties")).body.length, 0);
  });

  it("allows only the widget to be framed by other sites", async () => {
    const widget = await fetch(`${baseUrl}/api/widget/properties/00000000-0000-0000-0000-000000000001`);
    const dashboard = await fetch(`${baseUrl}/api/properties`);
    assert.equal(dashboard.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.match(dashboard.headers.get("content-security-policy") ?? "", /frame-ancestors 'self'/);
    assert.equal(widget.headers.get("access-control-allow-origin"), null);
  });

  it("returns 404 for malformed ids instead of a database error", async () => {
    const owner = await signUpOwner();
    const res = await owner.get("/api/widget/properties/not-a-uuid");
    assert.equal(res.status, 404);
  });

  it("rate-limits public bookings", async () => {
    const owner = await signUpOwner();
    const { room } = await createPropertyWithRoom(owner);
    const guest = new Client();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await guest.post("/api/widget/bookings", { roomId: room.id });
      statuses.push(res.status);
    }
    assert.equal(statuses.at(-1), 429);
  });
});
