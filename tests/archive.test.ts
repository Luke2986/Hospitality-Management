import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Client, createPropertyWithRoom, guestBooking, signUpOwner } from "./helpers";

describe("archiving", () => {
  it("archives a room without upcoming bookings and restores it", async () => {
    const owner = await signUpOwner();
    const { property, room } = await createPropertyWithRoom(owner);

    const archived = await owner.delete(`/api/rooms/${room.id}`);
    assert.equal(archived.status, 200);
    assert.ok(archived.body.archivedAt);
    assert.deepEqual((await owner.get("/api/rooms")).body, []);
    assert.equal((await owner.get("/api/rooms?archived=true")).body.length, 1);
    assert.equal((await new Client().get(`/api/widget/properties/${property.id}`)).body.rooms.length, 0);
    assert.equal((await new Client().post("/api/widget/bookings", guestBooking(room.id))).status, 404);

    assert.equal((await owner.post(`/api/rooms/${room.id}/restore`)).body.archivedAt, null);
    assert.equal((await owner.get("/api/rooms")).body.length, 1);
  });

  it("asks for confirmation when there are upcoming bookings and keeps them", async () => {
    const owner = await signUpOwner();
    const { property, room } = await createPropertyWithRoom(owner);
    await owner.post("/api/bookings", guestBooking(room.id));

    const conflict = await owner.delete(`/api/properties/${property.id}`);
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, "HAS_UPCOMING_BOOKINGS");
    assert.equal(conflict.body.upcomingBookings, 1);

    assert.equal((await owner.delete(`/api/properties/${property.id}?confirm=true`)).status, 200);
    assert.deepEqual((await owner.get("/api/properties")).body, []);
    assert.deepEqual((await owner.get("/api/rooms")).body, []);
    assert.equal((await owner.get("/api/bookings")).body.length, 1);
    assert.equal((await new Client().get(`/api/widget/properties/${property.id}`)).status, 404);
  });

  it("does not count cancelled bookings as upcoming", async () => {
    const owner = await signUpOwner();
    const { room } = await createPropertyWithRoom(owner);
    const booking = await owner.post("/api/bookings", guestBooking(room.id));
    await owner.patch(`/api/bookings/${booking.body.id}`, { status: "cancelled" });
    assert.equal((await owner.delete(`/api/rooms/${room.id}`)).status, 200);
  });

  it("does not let another owner restore", async () => {
    const alice = await signUpOwner("alice@example.test");
    const bob = await signUpOwner("bob@example.test");
    const { property } = await createPropertyWithRoom(alice);
    await alice.delete(`/api/properties/${property.id}`);
    assert.equal((await bob.post(`/api/properties/${property.id}/restore`)).status, 404);
  });
});
