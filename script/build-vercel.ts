// Produces .vercel/output (Vercel Build Output API v3): the static client, one bundled function for /api,
// the same framing headers as server/app.ts, and the daily cron.
import { execSync } from "child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { build } from "esbuild";

const OUT = ".vercel/output";
const FUNCTION_DIR = `${OUT}/functions/api.func`;

async function main() {
  rmSync(OUT, { recursive: true, force: true });

  execSync("vite build", { stdio: "inherit" });
  if (process.env.DATABASE_URL) {
    execSync("tsx server/migrate.ts", { stdio: "inherit" });
  } else {
    console.warn("DATABASE_URL not set: migrations skipped");
  }

  cpSync("dist/public", `${OUT}/static`, { recursive: true });

  mkdirSync(FUNCTION_DIR, { recursive: true });
  await build({
    entryPoints: ["server/vercel.ts"],
    outfile: `${FUNCTION_DIR}/index.cjs`,
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    external: ["pg-native"],
    footer: { js: "module.exports = module.exports.default;" },
    logLevel: "warning",
  });
  // connect-pg-simple reads it next to its own code to create the session table on first use.
  cpSync("node_modules/connect-pg-simple/table.sql", `${FUNCTION_DIR}/table.sql`);
  writeFileSync(
    `${FUNCTION_DIR}/.vc-config.json`,
    JSON.stringify({ runtime: "nodejs22.x", handler: "index.cjs", launcherType: "Nodejs", shouldAddHelpers: false }, null, 2),
  );

  const config = {
    version: 3,
    routes: [
      { src: "^/widget/.*$", headers: { "Content-Security-Policy": "frame-ancestors *" }, continue: true },
      {
        src: "^/(?!widget/).*$",
        headers: { "Content-Security-Policy": "frame-ancestors 'self'", "X-Frame-Options": "SAMEORIGIN" },
        continue: true,
      },
      { src: "^/api(/.*)?$", dest: "/api" },
      { handle: "filesystem" },
      { src: "^/.*$", dest: "/index.html" },
    ],
    crons: [{ path: "/api/cron/daily", schedule: "0 3 * * *" }],
  };
  writeFileSync(`${OUT}/config.json`, JSON.stringify(config, null, 2));
  console.log(`Vercel output written to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
