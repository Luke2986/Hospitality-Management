import "../server/env";

// Tests wipe every table, so they only ever run against TEST_DATABASE_URL, never DATABASE_URL.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database: the tests delete all its data.");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET ??= "test-session-secret";
delete process.env.RESEND_API_KEY;
delete process.env.TURNSTILE_SITE_KEY;
delete process.env.TURNSTILE_SECRET_KEY;
