import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Client, createPropertyWithRoom, signUpOwner } from "./helpers";

describe("events", () => {
  it("creates, updates and deletes an event shown in the widget", async () => {
    const owner = await signUpOwner();
    const { property } = await createPropertyWithRoom(owner);
    const created = await owner.post("/api/events", {
      propertyId: property.id,
      title: "Sagra del cinghiale",
      eventDate: "2030-08-10",
      category: "sagra",
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.endDate, null);

    const updated = await owner.patch(`/api/events/${created.body.id}`, { title: "Sagra del tartufo" });
    assert.equal(updated.body.title, "Sagra del tartufo");
    const widget = await new Client().get(`/api/widget/properties/${property.id}`);
    assert.deepEqual(widget.body.events.map((e: { title: string }) => e.title), ["Sagra del tartufo"]);

    assert.equal((await owner.delete(`/api/events/${created.body.id}`)).status, 200);
    assert.deepEqual((await owner.get("/api/events")).body, []);
  });

  it("stores an optional web link for the event and shows it in the widget", async () => {
    const owner = await signUpOwner();
    const { property } = await createPropertyWithRoom(owner);
    const event = (url: unknown, title: string) =>
      owner.post("/api/events", { propertyId: property.id, title, eventDate: "2030-08-10", url });

    const linked = await event("https://www.sagra-del-cinghiale.it/programma", "Sagra");
    assert.equal(linked.status, 201);
    assert.equal(linked.body.url, "https://www.sagra-del-cinghiale.it/programma");
    assert.equal((await event("www.palio.it", "Palio")).body.url, "https://www.palio.it");
    assert.equal((await event("", "Mercato")).body.url, null);
    assert.equal((await event(undefined, "Concerto")).body.url, null);

    for (const bad of ["javascript:alert(1)", "data:text/html,hi", "ftp://files.example.it", "non un link"]) {
      assert.equal((await event(bad, `Evento ${bad}`)).status, 400, bad);
    }

    const cleared = await owner.patch(`/api/events/${linked.body.id}`, { url: "" });
    assert.equal(cleared.body.url, null);
    await owner.patch(`/api/events/${linked.body.id}`, { url: "sagra.it" });
    const widget = await new Client().get(`/api/widget/properties/${property.id}`);
    assert.equal(widget.body.events.find((e: { title: string }) => e.title === "Sagra").url, "https://sagra.it");
  });

  it("does not let an owner add events to someone else's property", async () => {
    const alice = await signUpOwner("alice@example.test");
    const bob = await signUpOwner("bob@example.test");
    const { property } = await createPropertyWithRoom(alice);
    const res = await bob.post("/api/events", { propertyId: property.id, title: "Spam", eventDate: "2030-08-10" });
    assert.equal(res.status, 404);
  });
});
