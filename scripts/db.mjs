// Runs Supabase CLI commands against the remote project using SUPABASE_DB_URL from .env.local.
// Usage: node scripts/db.mjs push | types
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL is missing from .env.local (Supabase → Connect → Session pooler).");
  process.exit(1);
}

const command = process.argv[2];
const run = (args, capture = false) =>
  spawnSync("npx", ["supabase", ...args], {
    stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
    shell: process.platform === "win32",
    encoding: "utf8",
  });

if (command === "push") {
  const result = run(["db", "push", `--remote=${dbUrl}`, "--include-seed", "--yes"]);
  process.exit(result.status ?? 1);
} else if (command === "types") {
  const result = run(["gen", "types", "--lang=typescript", "--schema", "public", `--remote=${dbUrl}`], true);
  if (result.status !== 0) process.exit(result.status ?? 1);
  writeFileSync("src/lib/supabase/database.types.ts", result.stdout);
  console.log("Wrote src/lib/supabase/database.types.ts");
} else {
  console.error("Usage: node scripts/db.mjs push | types");
  process.exit(1);
}
