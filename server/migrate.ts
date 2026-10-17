import "./env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "./db";

migrate(drizzle(pool), { migrationsFolder: "migrations" })
  .then(() => {
    console.log("Migrations applied");
    return pool.end();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
