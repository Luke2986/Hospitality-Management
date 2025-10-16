import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  properties, 
  rooms, 
  bookings, 
  events,
  type User,
  type InsertUser,
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

  // Properties
  getProperties(ownerId: string): Promise<Property[]>;
  getAllActiveProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<void>;

  // Rooms
  getRooms(propertyId?: string): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, data: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<void>;

  // Bookings
  getBookings(propertyId?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;

  // Events
  getEvents(propertyId?: string): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;
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

  // Properties
  async getProperties(ownerId: string): Promise<Property[]> {
    return db.select().from(properties).where(eq(properties.ownerId, ownerId)).orderBy(desc(properties.createdAt));
  }

  async getAllActiveProperties(): Promise<Property[]> {
    return db.select().from(properties).where(eq(properties.active, true)).orderBy(desc(properties.createdAt));
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
  async getRooms(propertyId?: string): Promise<Room[]> {
    if (propertyId) {
      return db.select().from(rooms).where(eq(rooms.propertyId, propertyId)).orderBy(desc(rooms.createdAt));
    }
    return db.select().from(rooms).orderBy(desc(rooms.createdAt));
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
  async getBookings(propertyId?: string): Promise<Booking[]> {
    if (propertyId) {
      return db.select().from(bookings).where(eq(bookings.propertyId, propertyId)).orderBy(desc(bookings.createdAt));
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
  async getEvents(propertyId?: string): Promise<Event[]> {
    if (propertyId) {
      return db.select().from(events).where(eq(events.propertyId, propertyId)).orderBy(desc(events.eventDate));
    }
    return db.select().from(events).orderBy(desc(events.eventDate));
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
