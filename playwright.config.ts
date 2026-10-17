import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 5174);
const baseURL = `http://127.0.0.1:${port}`;

// Every test wipes the shared test database, so tests run one at a time.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "tsx e2e/server.ts",
    url: baseURL,
    env: { E2E_PORT: String(port) },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
