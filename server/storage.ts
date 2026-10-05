import { eq, ne, asc, desc, and, sql, inArray, isNull, isNotNull, gt, gte, lt, lte, type SQL } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  authTokens,
  properties, 
  rooms, 
  bookings, 
  events,
  type User,
  type InsertUser,
  type AuthToken,
  type AuthTokenType,
  type Property,
  type InsertProperty,
  type Room,
  type InsertRoom,
  type Booking,
  type InsertBooking,
  type Event,
  type InsertEvent,
} from "@shared/schema";

export type BookedRange = { roomId: string; checkIn: string; checkOut: string };
export type Page = { limit: number; offset: number };

export type BookingFilters = {
  ownerId?: string;
  propertyId?: string;
  roomId?: string;
  status?: string;
  guestName?: string;
  checkInFrom?: string;
  checkInTo?: string;
};

// `from` keeps events still running on that day (end date on or after it).
export type EventFilters = { propertyId?: string; ownerId?: string; from?: string };

export type DashboardSummary = {
  bookingsThisMonth: number;
  pendingBookings: number;
  confirmedBookings: number;
  revenueThisMonth: string;
  upcomingCheckIns: Booking[];
  upcomingEvents: Event[];
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Locks the room row so concurrent bookings for the same room are checked one at a time.
async function lockRoom(tx: Tx, roomId: string) {
  await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, roomId)).for("update");
}

async function hasOverlap(tx: Tx, roomId: string, checkIn: string, checkOut: string, excludeId?: string) {
  const conditions: SQL[] = [
    eq(bookings.roomId, roomId),
    ne(bookings.status, "cancelled"),
    lt(bookings.checkIn, checkOut),
    gt(bookings.checkOut, checkIn),
  ];
  if (excludeId) conditions.push(ne(bookings.id, excludeId));
  const [clash] = await tx.select({ id: bookings.id }).from(bookings).where(and(...conditions)).limit(1);
  return !!clash;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  markEmailVerified(userId: string): Promise<void>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;

  // Auth tokens
  createAuthToken(token: { userId: string; type: AuthTokenType; tokenHash: string; expiresAt: Date }): Promise<void>;
  consumeAuthToken(tokenHash: string, type: AuthTokenType): Promise<AuthToken | undefined>;
  invalidateAuthTokens(userId: string, type: AuthTokenType): Promise<void>;

  // Properties
  getProperties(ownerId: string, options?: { archived?: boolean }): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty & { ownerId: string }): Promise<Property>;
  updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined>;
  setPropertyArchived(id: string, archived: boolean): Promise<Property | undefined>;

  // Rooms
  getRooms(filters?: { propertyId?: string; ownerId?: string; archived?: boolean }): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, data: Partial<InsertRoom>): Promise<Room | undefined>;
  setRoomArchived(id: string, archived: boolean): Promise<Room | undefined>;

  // Bookings
  getBookings(filters: BookingFilters, page?: Page): Promise<Booking[]>;
  countBookings(filters: BookingFilters): Promise<number>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBookingIfAvailable(booking: InsertBooking & { propertyId: string }): Promise<Booking | null>;
  updateBookingIfAvailable(id: string, data: Partial<InsertBooking>): Promise<Booking | null>;
  getBookedRanges(filter: { propertyId?: string; ownerId?: string }, fromDate: string): Promise<BookedRange[]>;
  getDashboardSummary(ownerId: string, today: string): Promise<DashboardSummary>;
  countUpcomingBookings(filter: { propertyId?: string; roomId?: string }, today: string): Promise<number>;
  updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;

  // Events
  getEvents(filters: EventFilters, page?: Page): Promise<Event[]>;
  countEvents(filters: EventFilters): Promise<number>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;
}

function ownedPropertyIds(ownerId: string) {
  return db.select({ id: properties.id }).from(properties).where(eq(properties.ownerId, ownerId));
}

function activePropertyIds(ownerId?: string) {
  const conditions: SQL[] = [isNull(properties.archivedAt)];
  if (ownerId) conditions.push(eq(properties.ownerId, ownerId));
  return db.select({ id: properties.id }).from(properties).where(and(...conditions));
}

function bookingConditions(filters: BookingFilters) {
  const conditions: SQL[] = [];
  if (filters.ownerId) conditions.push(inArray(bookings.propertyId, ownedPropertyIds(filters.ownerId)));
  if (filters.propertyId) conditions.push(eq(bookings.propertyId, filters.propertyId));
  if (filters.roomId) conditions.push(eq(bookings.roomId, filters.roomId));
  if (filters.status) conditions.push(eq(bookings.status, filters.status));
  if (filters.guestName) conditions.push(sql`${bookings.guestName} ILIKE ${`%${filters.guestName}%`}`);
  if (filters.checkInFrom) conditions.push(gte(bookings.checkIn, filters.checkInFrom));
  if (filters.checkInTo) conditions.push(lte(bookings.checkIn, filters.checkInTo));
  return and(...conditions);
}

function eventConditions(filters: EventFilters) {
  const conditions: SQL[] = [];
  if (filters.propertyId) conditions.push(eq(events.propertyId, filters.propertyId));
  if (filters.ownerId) conditions.push(inArray(events.propertyId, activePropertyIds(filters.ownerId)));
  if (filters.from) conditions.push(sql`coalesce(${events.endDate}, ${events.eventDate}) >= ${filters.from}`);
  return and(...conditions);
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await db.update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ password: passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  // Auth tokens
  async createAuthToken(token: { userId: string; type: AuthTokenType; tokenHash: string; expiresAt: Date }): Promise<void> {
    await db.insert(authTokens).values(token);
  }

  // Single UPDATE ... RETURNING so a token can't be redeemed twice by concurrent requests
  async consumeAuthToken(tokenHash: string, type: AuthTokenType): Promise<AuthToken | undefined> {
    const [token] = await db.update(authTokens)
      .set({ usedAt: new Date() })
      .where(and(
        eq(authTokens.tokenHash, tokenHash),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ))
      .returning();
    return token;
  }

  async invalidateAuthTokens(userId: string, type: AuthTokenType): Promise<void> {
    await db.update(authTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(authTokens.userId, userId), eq(authTokens.type, type), isNull(authTokens.usedAt)));
  }

  // Properties
  async getProperties(ownerId: string, options?: { archived?: boolean }): Promise<Property[]> {
    return db.select().from(properties)
      .where(and(
        eq(properties.ownerId, ownerId),
        options?.archived ? isNotNull(properties.archivedAt) : isNull(properties.archivedAt),
      ))
      .orderBy(desc(options?.archived ? properties.archivedAt : properties.createdAt));
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(property: InsertProperty & { ownerId: string }): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }

  async updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updated] = await db.update(properties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updated;
  }

  async setPropertyArchived(id: string, archived: boolean): Promise<Property | undefined> {
    const [updated] = await db.update(properties)
      .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updated;
  }

  // Rooms
  // Rooms of an archived property are hidden with it and come back when the property is restored,
  // so the archived list only holds rooms archived on their own.
  async getRooms(filters?: { propertyId?: string; ownerId?: string; archived?: boolean }): Promise<Room[]> {
    const conditions: SQL[] = [
      inArray(rooms.propertyId, activePropertyIds(filters?.ownerId)),
      filters?.archived ? isNotNull(rooms.archivedAt) : isNull(rooms.archivedAt),
    ];
    if (filters?.propertyId) conditions.push(eq(rooms.propertyId, filters.propertyId));
    return db.select().from(rooms)
      .where(and(...conditions))
      .orderBy(desc(filters?.archived ? rooms.archivedAt : rooms.createdAt));
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: string, data: Partial<InsertRoom>): Promise<Room | undefined> {
    const [updated] = await db.update(rooms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updated;
  }

  async setRoomArchived(id: string, archived: boolean): Promise<Room | undefined> {
    const [updated] = await db.update(rooms)
      .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updated;
  }

  // Bookings
  async getBookings(filters: BookingFilters, page?: Page): Promise<Booking[]> {
    const query = db.select().from(bookings).where(bookingConditions(filters))
      .orderBy(desc(bookings.createdAt), desc(bookings.id))
      .$dynamic();
    return page ? query.limit(page.limit).offset(page.offset) : query;
  }

  async countBookings(filters: BookingFilters): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(bookingConditions(filters));
    return row.count;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBookingIfAvailable(booking: InsertBooking & { propertyId: string }): Promise<Booking | null> {
    return db.transaction(async (tx) => {
      await lockRoom(tx, booking.roomId);
      if (await hasOverlap(tx, booking.roomId, booking.checkIn, booking.checkOut)) return null;
      const [newBooking] = await tx.insert(bookings).values(booking).returning();
      return newBooking;
    });
  }

  async updateBookingIfAvailable(id: string, data: Partial<InsertBooking>): Promise<Booking | null> {
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(bookings).where(eq(bookings.id, id));
      if (!current) return null;
      const next = { ...current, ...data };
      if (next.status !== "cancelled") {
        await lockRoom(tx, next.roomId);
        if (await hasOverlap(tx, next.roomId, next.checkIn, next.checkOut, id)) return null;
      }
      const [updated] = await tx.update(bookings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(bookings.id, id))
        .returning();
      return updated;
    });
  }

  async getBookedRanges(filter: { propertyId?: string; ownerId?: string }, fromDate: string): Promise<BookedRange[]> {
    return db.select({ roomId: bookings.roomId, checkIn: bookings.checkIn, checkOut: bookings.checkOut })
      .from(bookings)
      .where(and(
        bookingConditions(filter),
        ne(bookings.status, "cancelled"),
        gte(bookings.checkOut, fromDate),
      ));
  }

  async getDashboardSummary(ownerId: string, today: string): Promise<DashboardSummary> {
    const owned = bookingConditions({ ownerId });
    const monthStart = `${today.slice(0, 7)}-01`;
    const thisMonth = sql`${bookings.createdAt} >= ${monthStart}::date`;
    const [stats] = await db.select({
      bookingsThisMonth: sql<number>`(count(*) filter (where ${thisMonth}))::int`,
      pendingBookings: sql<number>`(count(*) filter (where ${bookings.status} = 'pending'))::int`,
      confirmedBookings: sql<number>`(count(*) filter (where ${bookings.status} = 'confirmed'))::int`,
      revenueThisMonth: sql<string>`coalesce(sum(${bookings.totalPrice}) filter (where ${thisMonth} and ${bookings.status} <> 'cancelled'), 0)::numeric(12, 2)::text`,
    }).from(bookings).where(owned);

    const upcomingCheckIns = await db.select().from(bookings)
      .where(and(
        owned,
        eq(bookings.status, "confirmed"),
        gte(bookings.checkIn, today),
        sql`${bookings.checkIn} <= ${today}::date + 3`,
      ))
      .orderBy(asc(bookings.checkIn))
      .limit(5);

    const upcomingEvents = await db.select().from(events)
      .where(and(
        eventConditions({ ownerId }),
        gte(events.eventDate, today),
        sql`${events.eventDate} <= ${today}::date + 7`,
      ))
      .orderBy(asc(events.eventDate))
      .limit(5);

    return { ...stats, upcomingCheckIns, upcomingEvents };
  }

  async countUpcomingBookings(filter: { propertyId?: string; roomId?: string }, today: string): Promise<number> {
    const conditions: SQL[] = [ne(bookings.status, "cancelled"), gt(bookings.checkOut, today)];
    if (filter.propertyId) conditions.push(eq(bookings.propertyId, filter.propertyId));
    if (filter.roomId) conditions.push(eq(bookings.roomId, filter.roomId));
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(and(...conditions));
    return row.count;
  }

  async updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async deleteBooking(id: string): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  // Events
  async getEvents(filters: EventFilters, page?: Page): Promise<Event[]> {
    const query = db.select().from(events).where(eventConditions(filters))
      .orderBy(desc(events.eventDate), desc(events.id))
      .$dynamic();
    return page ? query.limit(page.limit).offset(page.offset) : query;
  }

  async countEvents(filters: EventFilters): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(events).where(eventConditions(filters));
    return row.count;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db.update(events)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }
}

export const storage = new DatabaseStorage();
