import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "@shared/schema";

// The public demo can run without a database server: PGlite keeps a Postgres database in this process's memory.
export const isInMemory = !process.env.DATABASE_URL && process.env.DEMO_MODE === "true";

if (!process.env.DATABASE_URL && !isInMemory) {
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

function createDatabase() {
  if (isInMemory) {
    const client = new PGlite();
    const memoryDb = drizzlePglite({ client, schema });
    // Only the query/end subset of pg.Pool is used outside Drizzle, and PGlite answers it with the same shape.
    const memoryPool = {
      query: (text: string, params?: unknown[]) => client.query(text, params),
      end: () => client.close(),
    } as unknown as Pool;
    return {
      pool: memoryPool,
      db: memoryDb as unknown as NodePgDatabase<typeof schema>,
      ready: migratePglite(memoryDb, { migrationsFolder: "migrations" }),
    };
  }

  // Serverless platforms run many small instances: keep each one's share of the database connections low.
  const pool = new Pool({ ...connectionConfig(), max: process.env.VERCEL ? 3 : 10 });
  // Without a listener, an idle connection dropped by the server crashes the process.
  pool.on("error", (err) => {
    console.error("Idle database connection error:", err.message);
  });
  return { pool, db: drizzle({ client: pool, schema }), ready: Promise.resolve() };
}

const database = createDatabase();
export const pool = database.pool;
export const db = database.db;
/** Resolves once the schema exists: immediately for a real database, after the migrations for the in-memory one. */
export const databaseReady = database.ready;
