import "./env";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, INTERNAL_ERROR } from "./routes";
import { logError } from "./log-error";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Logs only method, path, status and timing: response bodies contain guests' personal data.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
    }
  });
  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
      logError(`${req.method} ${req.path}`, err);
    }
    if (res.headersSent) return next(err);
    res.status(status).json({ error: status >= 500 ? INTERNAL_ERROR : err.message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
