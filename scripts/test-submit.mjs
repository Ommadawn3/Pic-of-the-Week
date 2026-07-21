// Verifies the guarantees the submit server action relies on:
//  1. one-per-week enforcement (unique index blocks a 2nd photo)
//  2. storage upload + photo insert shows up in the ranked feed
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runSql } from "./mgmt.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function admin(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/${path}`, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...(opts.headers ?? {}) },
  });
  return res;
}

const q = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);

// 1. One-per-week: Alex already has a photo this week — a 2nd insert must fail.
const [{ id: activeWeek }] = await runSql("select id from contest_weeks where status='active'");
const [{ id: alexId }] = await runSql(
  "select owner_user_id as id from photos where contest_week_id=" + q(activeWeek) + " limit 1",
);
let blocked = false;
try {
  await runSql(`insert into photos (contest_week_id, owner_user_id, image_url, first_name, captured_at)
    values (${q(activeWeek)}, ${q(alexId)}, '/x.jpg', 'Alex', now())`);
} catch (e) {
  blocked = /one_photo_per_user_per_week|duplicate key/.test(String(e.message));
}
console.log(`1. Duplicate photo blocked by unique index: ${blocked ? "PASS" : "FAIL"}`);

// 2. Fresh user upload -> appears in feed. Create a throwaway auth user.
const email = `submit-test-${Date.now()}@seed.picoftheweek.test`;
const created = await (
  await admin("auth/v1/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, email_confirm: true }),
  })
).json();
const newUserId = created.id;

const bytes = readFileSync(join(here, "..", "public", "seed", "sample-photo-1.png"));
const path = `${activeWeek}/test-${Date.now()}.jpg`;
const up = await admin(`storage/v1/object/photos/${path}`, {
  method: "POST",
  headers: { "Content-Type": "image/jpeg" },
  body: bytes,
});
console.log(`2a. Storage upload: ${up.ok ? "PASS" : "FAIL " + up.status}`);
const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${path}`;

const [photo] = await runSql(`insert into photos (contest_week_id, owner_user_id, image_url, first_name, initial, captured_at)
  values (${q(activeWeek)}, ${q(newUserId)}, ${q(publicUrl)}, 'Testy', 'Q', now()) returning id`);

const feed = await runSql(`select id, first_name from get_week_feed(${q(activeWeek)})`);
const inFeed = feed.some((p) => p.id === photo.id);
console.log(`2b. New photo appears in feed: ${inFeed ? "PASS" : "FAIL"} (feed now has ${feed.length} photos)`);

// Confirm the uploaded object is publicly readable.
const pub = await fetch(publicUrl);
console.log(`2c. Uploaded image is publicly readable: ${pub.ok ? "PASS" : "FAIL " + pub.status}`);

// Cleanup the throwaway photo + user so seed data stays clean.
await runSql(`delete from photos where id=${q(photo.id)}`);
await admin(`auth/v1/admin/users/${newUserId}`, { method: "DELETE" });
await admin(`storage/v1/object/photos/${path}`, { method: "DELETE" });
console.log("Cleaned up test artifacts.");
