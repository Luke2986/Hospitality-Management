import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, INTERNAL_ERROR } from "./routes";
import { logError } from "./log-error";
import { log } from "./vite";

export async function createApp() {
  const app = express();
  app.use(express.json());

  // Logs only method, path, status and timing: response bodies contain guests' personal data.
  app.use((req, res, next) => {
    const start = Date.now();
    // Read now: mounted middleware rewrites req.path.
    const path = req.path;
    res.on("finish", () => {
      if (path.startsWith("/api")) {
        log(`${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`);
      }
    });
    next();
  });

  // CSRF: browsers tag cross-site requests with Sec-Fetch-Site and Origin, so refuse state changes that come from
  // another site. Requests without either header (curl, server-to-server) carry no victim cookies to abuse.
  // APP_URL is accepted too, in case a reverse proxy rewrites the Host header.
  const appOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : null;

  app.use("/api", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const fetchSite = req.get("sec-fetch-site");
    const origin = req.get("origin");
    let crossSite = fetchSite === "cross-site" || fetchSite === "same-site";
    if (origin) {
      try {
        crossSite ||= new URL(origin).host !== req.get("host") && origin !== appOrigin;
      } catch {
        crossSite = true;
      }
    }
    if (crossSite) {
      return res.status(403).json({ error: "Richiesta non consentita" });
    }
    next();
  });

  // Only the booking widget may be framed by other sites; everything else (dashboard, login) is same-origin only.
  // No CORS headers: the widget iframe calls the API from the app's own origin.
  app.use((req, res, next) => {
    if (req.path.startsWith("/widget/")) {
      res.setHeader("Content-Security-Policy", "frame-ancestors *");
    } else {
      res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
    }
    next();
  });

  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
      logError(`${req.method} ${req.path}`, err);
    }
    if (res.headersSent) return next(err);
    res.status(status).json({ error: status >= 500 ? INTERNAL_ERROR : err.message });
  });

  return { app, server };
}
