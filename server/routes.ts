import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPropertySchema,
  insertRoomSchema,
  insertBookingSchema,
  insertEventSchema,
} from "@shared/schema";
import { fromError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {

  // Properties routes
  app.get("/api/properties", async (req: Request, res: Response) => {
    try {
      const properties = await storage.getAllActiveProperties();
      res.json(properties);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/properties", async (req: Request, res: Response) => {
    try {
      // Use a default UUID for ownerId since we don't have authentication
      const validatedData = insertPropertySchema.parse({
        ...req.body,
        ownerId: "00000000-0000-0000-0000-000000000000",
      });
      const property = await storage.createProperty(validatedData);
      res.json(property);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      const property = await storage.updateProperty(req.params.id, req.body);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteProperty(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Rooms routes
  app.get("/api/rooms", async (req: Request, res: Response) => {
    try {
      const propertyId = req.query.propertyId as string | undefined;
      const rooms = await storage.getRooms(propertyId);
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/rooms", async (req: Request, res: Response) => {
    try {
      const validatedData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(validatedData);
      res.json(room);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/rooms/:id", async (req: Request, res: Response) => {
    try {
      const room = await storage.updateRoom(req.params.id, req.body);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json(room);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/rooms/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteRoom(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Bookings routes
  app.get("/api/bookings", async (req: Request, res: Response) => {
    try {
      const filters = {
        propertyId: req.query.propertyId as string | undefined,
        roomId: req.query.roomId as string | undefined,
        status: req.query.status as string | undefined,
        guestName: req.query.guestName as string | undefined,
        checkInFrom: req.query.checkInFrom as string | undefined,
        checkInTo: req.query.checkInTo as string | undefined,
      };
      
      const bookings = await storage.getBookings(filters);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/bookings", async (req: Request, res: Response) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Get the room to find its propertyId
      const room = await storage.getRoom(validatedData.roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      // Add propertyId from the room
      const bookingData = {
        ...validatedData,
        propertyId: room.propertyId,
      };
      
      const booking = await storage.createBooking(bookingData);
      res.json(booking);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      const booking = await storage.updateBooking(req.params.id, req.body);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteBooking(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Events routes
  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const propertyId = req.query.propertyId as string | undefined;
      const events = await storage.getEvents(propertyId);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/events", async (req: Request, res: Response) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.json(event);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const event = await storage.updateEvent(req.params.id, req.body);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/events/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
