import "./env";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { storage } from "../server/storage";
import { guestDataRetentionMonths } from "../server/retention";
import { Client, clearEmails, createPropertyWithRoom, guestBooking, pool, signUpOwner, waitForEmails } from "./helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);

describe("guest privacy", () => {
  it("publishes the owner's data controller details in the widget", async () => {
    const owner = await signUpOwner();
    const { property } = await createPropertyWithRoom(owner);

    let widget = await new Client().get(`/api/widget/properties/${property.id}`);
    assert.deepEqual(widget.body.privacy, {
      controllerName: "Casa Test",
      controllerAddress: null,
      contactEmail: null,
      retentionMonths: 24,
      botProtection: false,
    });

    assert.equal((await owner.put("/api/account/privacy", {
      privacyControllerName: "Mario Rossi",
      privacyControllerAddress: "",
      privacyContactEmail: "non-una-email",
    })).status, 400);

    const saved = await owner.put("/api/account/privacy", {
      privacyControllerName: "  Agriturismo Rossi  ",
      privacyControllerAddress: "Via Roma 1, Siena",
      privacyContactEmail: "privacy@rossi.example",
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.privacyControllerName, "Agriturismo Rossi");
    assert.deepEqual((await owner.get("/api/account/privacy")).body, saved.body);

    widget = await new Client().get(`/api/widget/properties/${property.id}`);
    assert.equal(widget.body.privacy.controllerName, "Agriturismo Rossi");
    assert.equal(widget.body.privacy.contactEmail, "privacy@rossi.example");
  });

  it("lets the owner erase a guest's personal data", async () => {
    const owner = await signUpOwner("owner@example.test");
    const other = await signUpOwner("other@example.test");
    const { room } = await createPropertyWithRoom(owner);
    const booking = await new Client().post("/api/widget/bookings", guestBooking(room.id, { guestPhone: "333", notes: "allergie" }));

    assert.equal((await other.post(`/api/bookings/${booking.body.id}/anonymize`)).status, 404);
    const res = await owner.post(`/api/bookings/${booking.body.id}/anonymize`);
    assert.equal(res.status, 200);
    assert.equal(res.body.guestName, "Ospite anonimizzato");
    assert.equal(res.body.guestEmail, "anonimizzato@invalid");
    assert.equal(res.body.guestPhone, null);
    assert.equal(res.body.notes, null);
    assert.ok(res.body.anonymizedAt);
    assert.equal(res.body.totalPrice, "240.00");

    await waitForEmails(2);
    clearEmails();
    await owner.patch(`/api/bookings/${booking.body.id}`, { status: "confirmed" });
    assert.equal((await waitForEmails(1)).length, 0, "no email to an erased address");
  });

  it("anonymizes bookings that ended longer ago than the retention period", async () => {
    const owner = await signUpOwner();
    const { room } = await createPropertyWithRoom(owner);
    const old = await owner.post("/api/bookings", guestBooking(room.id, { checkIn: isoDay(-800), checkOut: isoDay(-798) }));
    const recent = await owner.post("/api/bookings", guestBooking(room.id, { checkIn: isoDay(-30), checkOut: isoDay(-28) }));

    assert.equal(await storage.anonymizeBookingsEndedBefore(24), 1);
    assert.equal(await storage.anonymizeBookingsEndedBefore(24), 0, "already anonymized rows are skipped");

    const { rows } = await pool.query("SELECT id, guest_name FROM bookings");
    const names = Object.fromEntries(rows.map((r) => [r.id, r.guest_name]));
    assert.equal(names[old.body.id], "Ospite anonimizzato");
    assert.equal(names[recent.body.id], "Mario Rossi");
  });

  it("rejects an invalid retention period", () => {
    const previous = process.env.GUEST_DATA_RETENTION_MONTHS;
    try {
      process.env.GUEST_DATA_RETENTION_MONTHS = "0";
      assert.throws(guestDataRetentionMonths);
      process.env.GUEST_DATA_RETENTION_MONTHS = "36";
      assert.equal(guestDataRetentionMonths(), 36);
    } finally {
      if (previous === undefined) delete process.env.GUEST_DATA_RETENTION_MONTHS;
      else process.env.GUEST_DATA_RETENTION_MONTHS = previous;
    }
  });
});
