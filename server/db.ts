import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// TLS follows the sslmode in DATABASE_URL: require or verify-full check the certificate, no-verify skips the check.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Without a listener, an idle connection dropped by the server crashes the process.
pool.on("error", (err) => {
  console.error("Idle database connection error:", err.message);
});

export const db = drizzle({ client: pool, schema });
