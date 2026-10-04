import { existsSync } from "node:fs";

// Variables already set in the environment take precedence over the file.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}
