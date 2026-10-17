// Must stay the first import: it points the app at the test database before any server module loads.
import "../tests/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "../server/db";
import { createApp } from "../server/app";
import { setupVite } from "../server/vite";

(async () => {
  await migrate(drizzle(pool), { migrationsFolder: "migrations" });
  const { app, server } = await createApp();
  await setupVite(app, server);
  const port = Number(process.env.E2E_PORT ?? 5174);
  server.listen(port, "127.0.0.1", () => console.log(`e2e server listening on ${port}`));
})();
