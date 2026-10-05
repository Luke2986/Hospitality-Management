import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Client, clearEmails, createPropertyWithRoom, guestBooking, signUpOwner, waitForEmails } from "./helpers";

async function setup() {
  const owner = await signUpOwner("owner@example.test");
  const { room } = await createPropertyWithRoom(owner);
  await waitForEmails(1);
  clearEmails();
  return { owner, room };
}

describe("booking notifications", () => {
  it("emails the guest and the owner when a guest books from the widget", async () => {
    const { room } = await setup();
    const res = await new Client().post("/api/widget/bookings", guestBooking(room.id, { guestPhone: "+39 333 1234567" }));
    assert.equal(res.status, 201);

    const emails = await waitForEmails(2);
    assert.equal(emails.length, 2);
    const guest = emails.find((e) => e.to === "mario@example.test");
    const owner = emails.find((e) => e.to === "owner@example.test");
    assert.equal(guest?.subject, "Richiesta di prenotazione ricevuta – Casa Test");
    assert.match(guest!.text, /Check-in: 1 maggio 2030/);
    assert.match(guest!.text, /Totale: € 240\.00/);
    assert.equal(owner?.subject, "Nuova richiesta di prenotazione – Casa Test");
    assert.match(owner!.text, /Telefono: \+39 333 1234567/);
    assert.match(owner!.text, /\/dashboard\/bookings/);
  });

  it("tells the guest when the owner confirms or cancels, and only then", async () => {
    const { owner, room } = await setup();
    const booking = await new Client().post("/api/widget/bookings", guestBooking(room.id));
    await waitForEmails(2);
    clearEmails();

    await owner.patch(`/api/bookings/${booking.body.id}`, { notes: "Arrivo tardi" });
    assert.equal((await waitForEmails(1)).length, 0, "editing notes sends nothing");

    await owner.patch(`/api/bookings/${booking.body.id}`, { status: "confirmed" });
    let emails = await waitForEmails(1);
    assert.deepEqual(emails.map((e) => [e.to, e.subject]), [["mario@example.test", "Prenotazione confermata – Casa Test"]]);

    clearEmails();
    await owner.patch(`/api/bookings/${booking.body.id}`, { status: "confirmed" });
    assert.equal((await waitForEmails(1)).length, 0, "no email when the status doesn't change");

    await owner.patch(`/api/bookings/${booking.body.id}`, { status: "cancelled" });
    emails = await waitForEmails(1);
    assert.deepEqual(emails.map((e) => e.subject), ["Prenotazione annullata – Casa Test"]);
  });

  it("tells the owner when the guest cancels", async () => {
    const { room } = await setup();
    const guest = new Client();
    const booking = await guest.post("/api/widget/bookings", guestBooking(room.id));
    await waitForEmails(2);
    clearEmails();

    await guest.post(`/api/widget/bookings/${booking.body.id}/cancel`);
    const emails = await waitForEmails(1);
    assert.deepEqual(emails.map((e) => [e.to, e.subject]), [["owner@example.test", "Prenotazione annullata dall'ospite – Casa Test"]]);
  });

  it("stays quiet when the owner books from their own calendar", async () => {
    const { owner, room } = await setup();
    assert.equal((await owner.post("/api/widget/bookings", guestBooking(room.id))).status, 201);
    assert.equal((await owner.post("/api/bookings", guestBooking(room.id, { checkIn: "2030-06-01", checkOut: "2030-06-02" }))).status, 201);
    assert.equal((await waitForEmails(1)).length, 0);
  });
});
