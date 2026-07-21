// Verifies record_view's anti-gaming guarantees using a REAL user JWT:
//   * seconds clamp to 120
//   * only the best (longest) session is kept (re-view never lowers it)
//   * runs as the authenticated user (auth.uid()) under RLS
import { runSql } from "./mgmt.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Get a session token for a seed user via admin-generated magic link + verify.
async function userToken(email) {
  const gen = await (
    await fetch(`${URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", email }),
    })
  ).json();
  const hashed = gen.hashed_token ?? gen.properties?.hashed_token;
  const verify = await (
    await fetch(`${URL}/auth/v1/verify`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: hashed }),
    })
  ).json();
  return verify.access_token;
}

async function callRecordView(token, photoId, seconds) {
  const res = await fetch(`${URL}/rest/v1/rpc/record_view`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_photo_id: photoId, p_seconds: seconds }),
  });
  if (!res.ok) throw new Error(`rpc ${res.status}: ${await res.text()}`);
}

const [{ id: week }] = await runSql("select id from contest_weeks where status='active'");
// A photo NOT owned by sam and with no prior sam view, to start clean.
const [{ id: samId }] = await runSql(
  "select id from users where email='sam@seed.picoftheweek.test'",
);
const [{ id: photoId }] = await runSql(
  `select p.id from photos p where p.contest_week_id='${week}' and p.owner_user_id <> '${samId}'
     and not exists (select 1 from view_sessions v where v.photo_id=p.id and v.viewer_user_id='${samId}')
   limit 1`,
);

const token = await userToken("sam@seed.picoftheweek.test");
if (!token) throw new Error("could not get user token");

await callRecordView(token, photoId, 200); // over cap
let [{ seconds_viewed: a }] = await runSql(
  `select seconds_viewed from view_sessions where photo_id='${photoId}' and viewer_user_id='${samId}'`,
);
console.log(`1. 200s clamped to 120: ${Number(a) === 120 ? "PASS" : "FAIL (" + a + ")"}`);

await callRecordView(token, photoId, 30); // lower than stored best
let [{ seconds_viewed: b }] = await runSql(
  `select seconds_viewed from view_sessions where photo_id='${photoId}' and viewer_user_id='${samId}'`,
);
console.log(`2. Re-view at 30s keeps best (120): ${Number(b) === 120 ? "PASS" : "FAIL (" + b + ")"}`);

// Fresh photo, incremental sessions: 10 then 45 -> keeps 45.
const [{ id: photo2 }] = await runSql(
  `select p.id from photos p where p.contest_week_id='${week}' and p.owner_user_id <> '${samId}'
     and p.id <> '${photoId}'
     and not exists (select 1 from view_sessions v where v.photo_id=p.id and v.viewer_user_id='${samId}')
   limit 1`,
);
await callRecordView(token, photo2, 10);
await callRecordView(token, photo2, 45);
let [{ seconds_viewed: c }] = await runSql(
  `select seconds_viewed from view_sessions where photo_id='${photo2}' and viewer_user_id='${samId}'`,
);
console.log(`3. 10s then 45s keeps 45: ${Number(c) === 45 ? "PASS" : "FAIL (" + c + ")"}`);

// Cleanup the test sessions.
await runSql(
  `delete from view_sessions where viewer_user_id='${samId}' and photo_id in ('${photoId}','${photo2}')`,
);
console.log("Cleaned up test sessions.");
