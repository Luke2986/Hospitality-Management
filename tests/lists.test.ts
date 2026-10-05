import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Client, createPropertyWithRoom, guestBooking, pool, signUpOwner } from "./helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);

describe("paginated lists", () => {
  it("pages bookings and reports the total", async () => {
    const owner = await signUpOwner();
    const { room } = await createPropertyWithRoom(owner);
    for (let i = 0; i < 30; i++) {
      const res = await owner.post("/api/bookings", guestBooking(room.id, { checkIn: isoDay(100 + i * 2), checkOut: isoDay(101 + i * 2) }));
      assert.equal(res.status, 201);
    }

    const first = await owner.get("/api/bookings");
    assert.equal(first.body.length, 25);
    assert.equal(first.headers.get("x-total-count"), "30");
    const second = await owner.get("/api/bookings?limit=25&offset=25");
    assert.equal(second.body.length, 5);
    const ids = new Set([...first.body, ...second.body].map((b: { id: string }) => b.id));
    assert.equal(ids.size, 30, "pages do not overlap");

    const filtered = await owner.get(`/api/bookings?checkInFrom=${isoDay(150)}&limit=2`);
    assert.equal(filtered.body.length, 2);
    assert.equal(filtered.headers.get("x-total-count"), "5");

    assert.equal((await owner.get("/api/bookings?limit=1000")).status, 400);
    assert.equal((await owner.get("/api/bookings?offset=-1")).status, 400);
  });

  it("pages events", async () => {
    const owner = await signUpOwner();
    const { property } = await createPropertyWithRoom(owner);
    for (let i = 0; i < 3; i++) {
      await owner.post("/api/events", { propertyId: property.id, title: `Evento ${i}`, eventDate: isoDay(10 + i) });
    }
    const page = await owner.get("/api/events?limit=2&offset=2");
    assert.equal(page.body.length, 1);
    assert.equal(page.headers.get("x-total-count"), "3");
  });
});

describe("calendar and dashboard", () => {
  it("returns only what the booking calendar needs", async () => {
    const owner = await signUpOwner();
    const { property, room } = await createPropertyWithRoom(owner);
    await owner.post("/api/bookings", guestBooking(room.id, { checkIn: isoDay(-10), checkOut: isoDay(-8) }));
    await owner.post("/api/bookings", guestBooking(room.id, { checkIn: isoDay(5), checkOut: isoDay(7) }));
    const cancelled = await owner.post("/api/bookings", guestBooking(room.id, { checkIn: isoDay(20), checkOut: isoDay(22) }));
    await owner.patch(`/api/bookings/${cancelled.body.id}`, { status: "cancelled" });
    await owner.post("/api/events", { propertyId: property.id, title: "Passato", eventDate: isoDay(-30) });
    await owner.post("/api/events", { propertyId: property.id, title: "Ancora in corso", eventDate: isoDay(-3), endDate: isoDay(2) });
    await owner.post("/api/events", { propertyId: property.id, title: "Futuro", eventDate: isoDay(30) });

    const res = await owner.get("/api/calendar");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.rooms.map((r: { id: string }) => r.id), [room.id]);
    assert.deepEqual(res.body.bookedRanges, [{ roomId: room.id, checkIn: isoDay(5), checkOut: isoDay(7) }]);
    assert.deepEqual(res.body.events.map((e: { title: string }) => e.title), ["Ancora in corso", "Futuro"]);

    const widget = await new Client().get(`/api/widget/properties/${property.id}`);
    assert.deepEqual(widget.body.events.map((e: { title: string }) => e.title), ["Ancora in corso", "Futuro"]);
  });

  it("summarises the owner's month in the dashboard", async () => {
    const owner = await signUpOwner();
    const { property, room } = await createPropertyWithRoom(owner, { pricePerNight: "100.00" });
    const today = "2030-06-15";

    const confirmed = await owner.post("/api/bookings", guestBooking(room.id, { checkIn: "2030-06-16", checkOut: "2030-06-18" }));
    await owner.patch(`/api/bookings/${confirmed.body.id}`, { status: "confirmed" });
    await owner.post("/api/bookings", guestBooking(room.id, { checkIn: "2030-06-25", checkOut: "2030-06-26" }));
    const cancelled = await owner.post("/api/bookings", guestBooking(room.id, { checkIn: "2030-07-01", checkOut: "2030-07-05" }));
    await owner.patch(`/api/bookings/${cancelled.body.id}`, { status: "cancelled" });
    const lastMonth = await owner.post("/api/bookings", guestBooking(room.id, { checkIn: "2030-08-01", checkOut: "2030-08-02" }));
    await pool.query("UPDATE bookings SET created_at = '2030-06-10'");
    await pool.query("UPDATE bookings SET created_at = '2030-05-20' WHERE id = $1", [lastMonth.body.id]);
    await owner.post("/api/events", { propertyId: property.id, title: "Tra tre giorni", eventDate: "2030-06-18" });
    await owner.post("/api/events", { propertyId: property.id, title: "Tra un mese", eventDate: "2030-07-15" });

    const other = await signUpOwner("other@example.test");
    const { room: otherRoom } = await createPropertyWithRoom(other);
    await other.post("/api/bookings", guestBooking(otherRoom.id));

    const summary = (await owner.get(`/api/dashboard/summary?today=${today}`)).body;
    assert.equal(summary.bookingsThisMonth, 3);
    assert.equal(summary.pendingBookings, 2);
    assert.equal(summary.confirmedBookings, 1);
    assert.equal(summary.revenueThisMonth, "300.00");
    assert.deepEqual(summary.upcomingCheckIns.map((b: { checkIn: string }) => b.checkIn), ["2030-06-16"]);
    assert.deepEqual(summary.upcomingEvents.map((e: { title: string }) => e.title), ["Tra tre giorni"]);
  });
});
