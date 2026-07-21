// Applies pending SQL files in supabase/migrations (sorted) via the Supabase
// Management API over HTTPS. Tracks applied files in a _migrations table so
// re-running only applies new ones.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runSql } from "./mgmt.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "supabase", "migrations");

await runSql(
  "create table if not exists _migrations (name text primary key, applied_at timestamptz default now());",
);
const applied = new Set(
  (await runSql("select name from _migrations")).map((r) => r.name),
);

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`Skipping ${file} (already applied)`);
    continue;
  }
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  process.stdout.write(`Applying ${file} ... `);
  await runSql(sql);
  await runSql(`insert into _migrations (name) values ('${file}')`);
  console.log("done");
  count++;
}

console.log(`\nApplied ${count} new migration(s).`);
