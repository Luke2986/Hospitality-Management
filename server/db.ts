import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// TLS follows the sslmode in DATABASE_URL: require or verify-full check the certificate, no-verify skips the check.
// DATABASE_CA_CERT: PEM of a provider's own CA (e.g. Supabase). sslmode is dropped because pg lets it override `ssl`.
function connectionConfig() {
  const ca = process.env.DATABASE_CA_CERT;
  if (!ca) return { connectionString: process.env.DATABASE_URL };
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  return { connectionString: url.toString(), ssl: { ca } };
}

// Serverless platforms run many small instances: keep each one's share of the database connections low.
export const pool = new Pool({ ...connectionConfig(), max: process.env.VERCEL ? 3 : 10 });

// Without a listener, an idle connection dropped by the server crashes the process.
pool.on("error", (err) => {
  console.error("Idle database connection error:", err.message);
});

export const db = drizzle({ client: pool, schema });
