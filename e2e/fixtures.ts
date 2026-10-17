import "../server/env";
import { test as base, expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import type { Booking, Property, Room } from "@shared/schema";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database: the tests delete all its data.");
}

export const db = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 });

export const PASSWORD = "correct-horse-battery";

export const test = base.extend({
  page: async ({ page }, use) => {
    await db.query(
      "TRUNCATE users, properties, rooms, bookings, events, auth_tokens, rate_limits RESTART IDENTITY CASCADE",
    );
    await use(page);
  },
});

export { expect };

async function ok<T = any>(response: Awaited<ReturnType<APIRequestContext["post"]>>): Promise<T> {
  if (!response.ok()) throw new Error(`${response.url()}: ${response.status()} ${await response.text()}`);
  return (await response.json()) as T;
}

// Signs up a verified owner through the API. Passing page.request logs the page in too, since they share cookies.
export async function signUpOwner(request: APIRequestContext, email = "owner@example.test") {
  await ok(await request.post("/api/auth/signup", { data: { email, password: PASSWORD, fullName: "Anna Bianchi" } }));
  await db.query("UPDATE users SET email_verified_at = now() WHERE email = $1", [email]);
  await ok(await request.post("/api/auth/login", { data: { email, password: PASSWORD } }));
}

export async function createPropertyWithRoom(request: APIRequestContext) {
  const property = await ok<Property>(await request.post("/api/properties", { data: { name: "Casa Test", city: "Siena" } }));
  const room = await ok<Room>(
    await request.post("/api/rooms", {
      data: { propertyId: property.id, name: "Camera Rossa", maxGuests: 2, pricePerNight: "80.00" },
    }),
  );
  return { property, room };
}

export async function createBooking(request: APIRequestContext, roomId: string, overrides: Record<string, unknown> = {}) {
  return ok<Booking>(
    await request.post("/api/bookings", {
      data: {
        roomId,
        guestName: "Mario Rossi",
        guestEmail: "mario@example.test",
        checkIn: "2030-05-01",
        checkOut: "2030-05-04",
        guestsCount: 2,
        ...overrides,
      },
    }),
  );
}

// A stay inside next month, which the two-month calendar always shows.
export function nextMonthDates(fromDay: number, toDay: number) {
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const iso = (day: number) =>
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { checkIn: iso(fromDay), checkOut: iso(toDay) };
}
