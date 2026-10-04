import "./env";
import { pool } from "./db";

// Owner of every property created before authentication existed; it has no password and cannot log in.
const LEGACY_OWNER_ID = "00000000-0000-0000-0000-000000000000";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run db:claim-legacy -- <email>");
    process.exitCode = 1;
    return;
  }

  const { rows: users } = await pool.query<{ id: string; email_verified_at: Date | null }>(
    "SELECT id, email_verified_at FROM users WHERE lower(email) = $1",
    [email],
  );
  const user = users[0];
  if (!user) {
    console.error(`No account with email ${email}. Sign up first, then rerun this command.`);
    process.exitCode = 1;
    return;
  }
  if (!user.email_verified_at) {
    console.error(`${email} has not confirmed its email address yet. Confirm it, then rerun this command.`);
    process.exitCode = 1;
    return;
  }

  const { rows: claimed } = await pool.query<{ name: string }>(
    "UPDATE properties SET owner_id = $1, updated_at = now() WHERE owner_id = $2 RETURNING name",
    [user.id, LEGACY_OWNER_ID],
  );
  if (claimed.length === 0) {
    console.log("No legacy properties to claim.");
  } else {
    console.log(`Assigned ${claimed.length} legacy properties to ${email}:`);
    for (const { name } of claimed) console.log(`- ${name}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
