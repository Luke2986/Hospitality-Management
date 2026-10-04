import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Client, createPropertyWithRoom, guestBooking, signUpOwner } from "./helpers";

describe("bookings", () => {
  it("prices widget bookings on the server and starts them as pending", async () => {
    const owner = await signUpOwner();
    const { room } = await createPropertyWithRoom(owner, { pricePerNight: "80.00" });
    const res = await new Client().post("/api/widget/bookings", guestBooking(room.id, { totalPrice: "1.00", status: "confirmed" }));
    assert.equal(res.status, 201);
    assert.equal(res.body.totalPrice, "240.00");
    assert.equal(res.body.status, "pending");
    assert.equal(res.body.checkIn, "2030-05-01");
    assert.equal(res.body.checkOut, "2030-05-04");
  });

  it("rejects overlapping stays but allows back-to-back ones", async () => {
    const owner = await signUpOwner();
    const { room } = await createPropertyWithRoom(owner);
    const guest = new Client();
    assert.equal((await guest.post("/api/widget/bookings", guestBooking(room.id))).status, 201);
    const overlap = await guest.post("/api/widget/bookings", guestBooking(room.id, { checkIn: "2030-05-03", checkOut: "2030-05-06" }));
    assert.equal(overlap.status, 409);
    const sameDay = await guest.post("/api/widget/bookings", guestBooking(room.id, { checkIn: "2030-05-04", checkOut: "2030-05-06" }));
    assert.equal(sameDay.status, 201);
  });

  it("accepts only one of many concurrent bookings for the same dates", async () => {
    const owner = await signUpOwner();
    const { room } = await createPropertyWithRoom(owner);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => owner.post("/api/bookings", guestBooking(room.id))),
    );
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal(results.filter((r) => r.status === 409).length, 7);
  });

  it("validates dates and guest count", async () => {
    const owner = await signUpOwner();
    const { room } = await createPropertyWithRoom(owner, { maxGuests: 2 });
    const guest = new Client();
    assert.equal((await guest.post("/api/widget/bookings", guestBooking(room.id, { checkOut: "2030-05-01" }))).status, 400);
    assert.equal((await guest.post("/api/widget/bookings", guestBooking(room.id, { guestsCount: 3 }))).status, 400);
  });

  it("frees the dates when a guest cancels a pending booking", async () => {
    const owner = await signUpOwner();
    const { room } = await createPropertyWithRoom(owner);
    const guest = new Client();
    const booking = await guest.post("/api/widget/bookings", guestBooking(room.id));
    assert.equal((await guest.post(`/api/widget/bookings/${booking.body.id}/cancel`)).status, 200);
    assert.equal((await guest.post("/api/widget/bookings", guestBooking(room.id))).status, 201);
  });

  it("rejects bookings with the honeypot field filled in", async () => {
    const owner = await signUpOwner();
    const { room } = await createPropertyWithRoom(owner);
    const res = await new Client().post("/api/widget/bookings", guestBooking(room.id, { website: "http://spam.example" }));
    assert.equal(res.status, 400);
  });

  it("does not expose the owner in the public widget data", async () => {
    const owner = await signUpOwner();
    const { property } = await createPropertyWithRoom(owner);
    const res = await new Client().get(`/api/widget/properties/${property.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.property.ownerId, undefined);
    assert.equal(res.body.rooms.length, 1);
  });
});
