import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { pool } from "./db";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export type PublicUser = Pick<User, "id" | "email" | "fullName">;

declare global {
  namespace Express {
    interface User extends PublicUser {}
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, fullName: user.fullName };
}

// Minimal in-memory fixed-window limiter; per-process only, good enough for a single instance.
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000).toString());
      return res.status(429).json({ error: "Troppi tentativi, riprova più tardi" });
    }
    next();
  };
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
});

const signupSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2).max(200),
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Autenticazione richiesta" });
}

export function setupAuth(app: Express) {
  const isProduction = app.get("env") === "production";

  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (isProduction) throw new Error("SESSION_SECRET must be set in production");
    secret = randomBytes(32).toString("hex");
    console.warn("SESSION_SECRET not set: using a random secret, sessions will not survive restarts");
  }

  if (isProduction) app.set("trust proxy", 1);

  const PgStore = connectPgSimple(session);
  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      name: "hm.sid",
      secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email.trim().toLowerCase());
        if (!user?.password || !(await verifyPassword(password, user.password))) {
          return done(null, false);
        }
        done(null, toPublicUser(user));
      } catch (err) {
        done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user ? toPublicUser(user) : false);
    } catch (err) {
      done(err);
    }
  });

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

  app.post("/api/auth/signup", authLimiter, async (req, res, next) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: fromError(parsed.error).toString() });
    }
    const { email, password, fullName } = parsed.data;
    try {
      if (await storage.getUserByEmail(email)) {
        return res.status(409).json({ error: "Esiste già un account con questa email" });
      }
      const user = await storage.createUser({ email, fullName, password: await hashPassword(password) });
      const publicUser = toPublicUser(user);
      req.login(publicUser, (err) => {
        if (err) return next(err);
        res.status(201).json(publicUser);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(401).json({ error: "Email o password non validi" });
    }
    req.body = parsed.data;
    passport.authenticate("local", (err: unknown, user: PublicUser | false) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: "Email o password non validi" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr);
        res.clearCookie("hm.sid");
        res.sendStatus(204);
      });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Autenticazione richiesta" });
    res.json(req.user);
  });
}
