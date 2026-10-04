import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { pool } from "./db";
import { storage } from "./storage";
import { log } from "./vite";
import { assertEmailConfig, sendPasswordResetEmail, sendVerificationEmail } from "./email";
import type { AuthTokenType, User } from "@shared/schema";

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

const TOKEN_TTL_MS: Record<AuthTokenType, number> = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function issueToken(userId: string, type: AuthTokenType) {
  await storage.invalidateAuthTokens(userId, type);
  const token = randomBytes(32).toString("base64url");
  await storage.createAuthToken({
    userId,
    type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS[type]),
  });
  return token;
}

// Fire-and-forget so response time doesn't reveal whether the email exists.
function sendInBackground(task: () => Promise<void>) {
  task().catch((err) => log(`Email delivery failed: ${err instanceof Error ? err.message : err}`, "email"));
}

async function sendVerification(user: User) {
  const token = await issueToken(user.id, "verify_email");
  await sendVerificationEmail(user.email, user.fullName, token);
}

async function destroyUserSessions(userId: string) {
  try {
    await pool.query(`DELETE FROM "session" WHERE sess->'passport'->>'user' = $1`, [userId]);
  } catch (err: any) {
    // connect-pg-simple creates the table lazily; if it doesn't exist yet there are no sessions to revoke.
    if (err?.code !== "42P01") throw err;
  }
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

const emailOnlySchema = credentialsSchema.pick({ email: true });
const tokenSchema = z.object({ token: z.string().min(20).max(200) });
const resetSchema = tokenSchema.extend({ password: credentialsSchema.shape.password });

const GENERIC_EMAIL_SENT = "Se l'indirizzo è registrato, riceverai un'email a breve.";

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

  assertEmailConfig();
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
        if (!user.emailVerifiedAt) {
          return done(null, false, { message: "EMAIL_NOT_VERIFIED" });
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
      done(null, user?.emailVerifiedAt ? toPublicUser(user) : false);
    } catch (err) {
      done(err);
    }
  });

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
  const emailLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

  // Same response whether or not the email is already registered, to avoid account enumeration.
  app.post("/api/auth/signup", authLimiter, async (req, res, next) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: fromError(parsed.error).toString() });
    }
    const { email, password, fullName } = parsed.data;
    try {
      const existing = await storage.getUserByEmail(email);
      if (!existing) {
        const user = await storage.createUser({ email, fullName, password: await hashPassword(password) });
        sendInBackground(() => sendVerification(user));
      } else if (!existing.emailVerifiedAt) {
        sendInBackground(() => sendVerification(existing));
      }
      res.status(201).json({ message: "Controlla la tua email per confermare l'account." });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/verify-email", authLimiter, async (req, res, next) => {
    const parsed = tokenSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Link non valido" });
    try {
      const token = await storage.consumeAuthToken(hashToken(parsed.data.token), "verify_email");
      if (!token) {
        return res.status(400).json({ error: "Link non valido o scaduto. Richiedi una nuova email di conferma." });
      }
      await storage.markEmailVerified(token.userId);
      const user = await storage.getUser(token.userId);
      if (!user) return res.status(400).json({ error: "Link non valido" });
      const publicUser = toPublicUser(user);
      req.login(publicUser, (err) => {
        if (err) return next(err);
        res.json(publicUser);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/resend-verification", emailLimiter, async (req, res, next) => {
    const parsed = emailOnlySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Email non valida" });
    try {
      const user = await storage.getUserByEmail(parsed.data.email);
      if (user && !user.emailVerifiedAt) sendInBackground(() => sendVerification(user));
      res.json({ message: GENERIC_EMAIL_SENT });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/forgot-password", emailLimiter, async (req, res, next) => {
    const parsed = emailOnlySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Email non valida" });
    try {
      const user = await storage.getUserByEmail(parsed.data.email);
      if (user) {
        sendInBackground(async () => {
          const token = await issueToken(user.id, "reset_password");
          await sendPasswordResetEmail(user.email, user.fullName, token);
        });
      }
      res.json({ message: GENERIC_EMAIL_SENT });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/reset-password", authLimiter, async (req, res, next) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: fromError(parsed.error).toString() });
    }
    try {
      const token = await storage.consumeAuthToken(hashToken(parsed.data.token), "reset_password");
      if (!token) {
        return res.status(400).json({ error: "Link non valido o scaduto. Richiedi un nuovo link." });
      }
      await storage.updateUserPassword(token.userId, await hashPassword(parsed.data.password));
      // Clicking the reset link proves control of the inbox.
      await storage.markEmailVerified(token.userId);
      await storage.invalidateAuthTokens(token.userId, "reset_password");
      await destroyUserSessions(token.userId);
      res.json({ message: "Password aggiornata. Ora puoi accedere." });
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
    passport.authenticate("local", (err: unknown, user: PublicUser | false, info?: { message?: string }) => {
      if (err) return next(err);
      if (info?.message === "EMAIL_NOT_VERIFIED") {
        return res.status(403).json({
          error: "Devi confermare il tuo indirizzo email prima di accedere.",
          code: "EMAIL_NOT_VERIFIED",
        });
      }
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
