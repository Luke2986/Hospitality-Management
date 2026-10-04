import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, requireAuth, rateLimit } from "./auth";
import { turnstileSiteKey, verifyTurnstile } from "./turnstile";
import { logError } from "./log-error";
import {
  insertPropertySchema,
  insertRoomSchema,
  insertBookingSchema,
  insertEventSchema,
  bookingStatusSchema,
  type Room,
} from "@shared/schema";
import { fromError } from "zod-validation-error";

const uuidSchema = z.string().uuid();

const updatePropertySchema = insertPropertySchema.omit({ ownerId: true }).partial();
const updateRoomSchema = insertRoomSchema.partial();
const updateBookingSchema = z.object({
  status: bookingStatusSchema,
  notes: z.string().nullable(),
}).partial();
const updateEventSchema = insertEventSchema.partial();

const guestBookingSchema = insertBookingSchema.pick({
  roomId: true,
  guestName: true,
  guestEmail: true,
  guestPhone: true,
  checkIn: true,
  checkOut: true,
  guestsCount: true,
  notes: true,
});

const DAY_MS = 24 * 60 * 60 * 1000;
export const INTERNAL_ERROR = "Errore interno del server";
const BOT_CHECK_FAILED = "Verifica anti-bot non riuscita, riprova";
const ROOM_UNAVAILABLE = "La camera non è disponibile per le date selezionate";

function sendError(res: Response, error: any) {
  if (error?.name === "ZodError") {
    return res.status(400).json({ error: fromError(error).toString() });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  logError(`${res.req.method} ${res.req.path}`, error);
  res.status(500).json({ error: INTERNAL_ERROR });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function priceBooking(room: Room, checkIn: string, checkOut: string, guestsCount: number) {
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / DAY_MS);
  if (!Number.isFinite(nights) || nights < 1) {
    throw new HttpError(400, "La data di check-out deve essere successiva al check-in");
  }
  if (guestsCount < 1 || guestsCount > room.maxGuests) {
    throw new HttpError(400, `La camera ospita al massimo ${room.maxGuests} ospiti`);
  }
  return (parseFloat(room.pricePerNight) * nights).toFixed(2);
}

async function ownsProperty(propertyId: string, userId: string) {
  const property = await storage.getProperty(propertyId);
  return property?.ownerId === userId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  for (const param of ["id", "propertyId"]) {
    app.param(param, (_req, res, next, value) => {
      if (!uuidSchema.safeParse(value).success) {
        return res.status(404).json({ error: "Not found" });
      }
      next();
    });
  }

  // Public widget endpoints
  const bookingLimiter = rateLimit({ name: "booking", windowMs: 60 * 60 * 1000, max: 10 });

  app.get("/api/widget/properties/:propertyId", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const property = await storage.getProperty(propertyId);
      if (!property || !property.active) {
        return res.status(404).json({ error: "Property not found" });
      }

      const allRooms = await storage.getRooms({ propertyId });
      const rooms = allRooms.filter((room) => room.isAvailable);

      const events = await storage.getEvents({ propertyId });
      const sortedEvents = [...events].sort(
        (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
      );

      // Yesterday in UTC, so no time zone can miss a stay that is still in progress.
      const fromDate = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
      const bookedRanges = await storage.getBookedRanges(propertyId, fromDate);

      const { ownerId: _ownerId, ...publicProperty } = property;
      res.json({
        property: publicProperty,
        rooms,
        events: sortedEvents,
        bookedRanges,
        turnstileSiteKey: turnstileSiteKey(),
      });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.post("/api/widget/bookings", bookingLimiter, async (req: Request, res: Response) => {
    try {
      // Hidden "website" field: people never see it, simple bots fill it in.
      if (req.body?.website) {
        return res.status(400).json({ error: BOT_CHECK_FAILED });
      }
      const data = guestBookingSchema.parse(req.body);
      // Logged-in owners booking from the dashboard calendar are already authenticated.
      if (!req.isAuthenticated() && !(await verifyTurnstile(req.body.turnstileToken, req.ip))) {
        return res.status(400).json({ error: BOT_CHECK_FAILED, code: "BOT_CHECK_FAILED" });
      }
      const room = await storage.getRoom(data.roomId);
      if (!room || !room.isAvailable) {
        return res.status(404).json({ error: "Room not found" });
      }
      const property = await storage.getProperty(room.propertyId);
      if (!property?.active) {
        return res.status(404).json({ error: "Room not found" });
      }
      const totalPrice = priceBooking(room, data.checkIn, data.checkOut, data.guestsCount);
      const booking = await storage.createBookingIfAvailable({
        ...data,
        propertyId: room.propertyId,
        totalPrice,
        status: "pending",
      });
      if (!booking) return res.status(409).json({ error: ROOM_UNAVAILABLE });
      res.status(201).json({
        id: booking.id,
        status: booking.status,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalPrice: booking.totalPrice,
      });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  // The booking id is only returned to the guest who created it, so it acts as a cancel token.
  app.post("/api/widget/bookings/:id/cancel", bookingLimiter, async (req: Request, res: Response) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.status !== "pending") {
        return res.status(404).json({ error: "Booking not found" });
      }
      await storage.updateBooking(booking.id, { status: "cancelled" });
      res.json({ id: booking.id, status: "cancelled" });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  // Everything below requires an authenticated owner
  app.use("/api", requireAuth);

  // Properties
  app.get("/api/properties", async (req: Request, res: Response) => {
    try {
      res.json(await storage.getProperties(req.user!.id));
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.post("/api/properties", async (req: Request, res: Response) => {
    try {
      const data = insertPropertySchema.parse({ ...req.body, ownerId: req.user!.id });
      res.status(201).json(await storage.createProperty(data));
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.patch("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      if (!(await ownsProperty(req.params.id, req.user!.id))) {
        return res.status(404).json({ error: "Property not found" });
      }
      const data = updatePropertySchema.parse(req.body);
      res.json(await storage.updateProperty(req.params.id, data));
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.delete("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      if (!(await ownsProperty(req.params.id, req.user!.id))) {
        return res.status(404).json({ error: "Property not found" });
      }
      await storage.deleteProperty(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  // Rooms
  app.get("/api/rooms", async (req: Request, res: Response) => {
    try {
      const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId : undefined;
      res.json(await storage.getRooms({ propertyId, ownerId: req.user!.id }));
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.post("/api/rooms", async (req: Request, res: Response) => {
    try {
      const data = insertRoomSchema.parse(req.body);
      if (!(await ownsProperty(data.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.status(201).json(await storage.createRoom(data));
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.patch("/api/rooms/:id", async (req: Request, res: Response) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room || !(await ownsProperty(room.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Room not found" });
      }
      const data = updateRoomSchema.parse(req.body);
      if (data.propertyId && !(await ownsProperty(data.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(await storage.updateRoom(req.params.id, data));
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.delete("/api/rooms/:id", async (req: Request, res: Response) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room || !(await ownsProperty(room.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Room not found" });
      }
      await storage.deleteRoom(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  // Bookings
  app.get("/api/bookings", async (req: Request, res: Response) => {
    try {
      const q = (key: string) => (typeof req.query[key] === "string" ? (req.query[key] as string) : undefined);
      res.json(
        await storage.getBookings({
          ownerId: req.user!.id,
          propertyId: q("propertyId"),
          roomId: q("roomId"),
          status: q("status"),
          guestName: q("guestName"),
          checkInFrom: q("checkInFrom"),
          checkInTo: q("checkInTo"),
        }),
      );
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.post("/api/bookings", async (req: Request, res: Response) => {
    try {
      const data = insertBookingSchema.omit({ totalPrice: true }).parse(req.body);
      const room = await storage.getRoom(data.roomId);
      if (!room || !(await ownsProperty(room.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Room not found" });
      }
      const totalPrice = priceBooking(room, data.checkIn, data.checkOut, data.guestsCount);
      const booking = await storage.createBookingIfAvailable({ ...data, propertyId: room.propertyId, totalPrice });
      if (!booking) return res.status(409).json({ error: ROOM_UNAVAILABLE });
      res.status(201).json(booking);
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.patch("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking || !(await ownsProperty(booking.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Booking not found" });
      }
      const data = updateBookingSchema.parse(req.body);
      const updated = await storage.updateBookingIfAvailable(req.params.id, data);
      if (!updated) return res.status(409).json({ error: ROOM_UNAVAILABLE });
      res.json(updated);
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.delete("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking || !(await ownsProperty(booking.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Booking not found" });
      }
      await storage.deleteBooking(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  // Events
  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId : undefined;
      const events = await storage.getEvents({ propertyId, ownerId: req.user!.id });
      res.json(
        [...events].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()),
      );
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.post("/api/events", async (req: Request, res: Response) => {
    try {
      const data = insertEventSchema.parse(req.body);
      if (!(await ownsProperty(data.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.status(201).json(await storage.createEvent(data));
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.patch("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event || !(await ownsProperty(event.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Event not found" });
      }
      const data = updateEventSchema.parse(req.body);
      if (data.propertyId && !(await ownsProperty(data.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(await storage.updateEvent(req.params.id, data));
    } catch (error: any) {
      sendError(res, error);
    }
  });

  app.delete("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event || !(await ownsProperty(event.propertyId, req.user!.id))) {
        return res.status(404).json({ error: "Event not found" });
      }
      await storage.deleteEvent(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      sendError(res, error);
    }
  });

  return createServer(app);
}
