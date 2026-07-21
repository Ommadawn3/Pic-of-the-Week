// Runs SQL against the Supabase project over HTTPS via the Management API.
// Used instead of a direct Postgres connection because some environments can
// only reach Supabase over HTTP(S), not the raw Postgres wire protocol.
//
// Needs SUPABASE_ACCESS_TOKEN (a Personal Access Token from
// https://supabase.com/dashboard/account/tokens) and the project ref.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(join(here, "..", ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // rely on ambient environment
}

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const REF =
  process.env.SUPABASE_PROJECT_REF ??
  PROJECT_URL.replace(/^https:\/\//, "").split(".")[0];

export function requireToken() {
  if (!TOKEN) {
    console.error(
      "Missing SUPABASE_ACCESS_TOKEN. Create a Personal Access Token at\n" +
        "https://supabase.com/dashboard/account/tokens and add it to .env.local.",
    );
    process.exit(1);
  }
  if (!REF) {
    console.error("Could not determine project ref from NEXT_PUBLIC_SUPABASE_URL.");
    process.exit(1);
  }
}

/** Execute one SQL string (may contain multiple statements). Returns rows. */
export async function runSql(query) {
  requireToken();
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const adminBase = `${PROJECT_URL}/auth/v1/admin`;
export const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
