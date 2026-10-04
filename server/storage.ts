import { eq, desc, and, sql, inArray, isNull, gt, type SQL } from "drizzle-orm";
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
  getProperties(ownerId: string): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<void>;

  // Rooms
  getRooms(filters?: { propertyId?: string; ownerId?: string }): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, data: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<void>;

  // Bookings
  getBookings(filters?: {
    ownerId?: string;
    propertyId?: string;
    roomId?: string;
    status?: string;
    guestName?: string;
    checkInFrom?: string;
    checkInTo?: string;
  }): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;

  // Events
  getEvents(filters?: { propertyId?: string; ownerId?: string }): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;
}

function ownedPropertyIds(ownerId: string) {
  return db.select({ id: properties.id }).from(properties).where(eq(properties.ownerId, ownerId));
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
  async getProperties(ownerId: string): Promise<Property[]> {
    return db.select().from(properties).where(eq(properties.ownerId, ownerId)).orderBy(desc(properties.createdAt));
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
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

  async deleteProperty(id: string): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  // Rooms
  async getRooms(filters?: { propertyId?: string; ownerId?: string }): Promise<Room[]> {
    const conditions: SQL[] = [];
    if (filters?.propertyId) conditions.push(eq(rooms.propertyId, filters.propertyId));
    if (filters?.ownerId) conditions.push(inArray(rooms.propertyId, ownedPropertyIds(filters.ownerId)));
    return db.select().from(rooms).where(and(...conditions)).orderBy(desc(rooms.createdAt));
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

  async deleteRoom(id: string): Promise<void> {
    await db.delete(rooms).where(eq(rooms.id, id));
  }

  // Bookings
  async getBookings(filters?: {
    ownerId?: string;
    propertyId?: string;
    roomId?: string;
    status?: string;
    guestName?: string;
    checkInFrom?: string;
    checkInTo?: string;
  }): Promise<Booking[]> {
    const conditions: SQL[] = [];

    if (filters?.ownerId) {
      conditions.push(inArray(bookings.propertyId, ownedPropertyIds(filters.ownerId)));
    }
    if (filters?.propertyId) {
      conditions.push(eq(bookings.propertyId, filters.propertyId));
    }
    if (filters?.roomId) {
      conditions.push(eq(bookings.roomId, filters.roomId));
    }
    if (filters?.status) {
      conditions.push(eq(bookings.status, filters.status));
    }
    if (filters?.guestName) {
      conditions.push(sql`${bookings.guestName} ILIKE ${`%${filters.guestName}%`}`);
    }
    if (filters?.checkInFrom) {
      conditions.push(sql`${bookings.checkIn} >= ${filters.checkInFrom}`);
    }
    if (filters?.checkInTo) {
      conditions.push(sql`${bookings.checkIn} <= ${filters.checkInTo}`);
    }
    
    if (conditions.length > 0) {
      return db.select().from(bookings).where(and(...conditions)).orderBy(desc(bookings.createdAt));
    }
    return db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
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
  async getEvents(filters?: { propertyId?: string; ownerId?: string }): Promise<Event[]> {
    const conditions: SQL[] = [];
    if (filters?.propertyId) conditions.push(eq(events.propertyId, filters.propertyId));
    if (filters?.ownerId) conditions.push(inArray(events.propertyId, ownedPropertyIds(filters.ownerId)));
    return db.select().from(events).where(and(...conditions)).orderBy(desc(events.eventDate));
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
