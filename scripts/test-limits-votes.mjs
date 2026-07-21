// Verifies the reworked rules:
//   * photo/caption limits are no longer hard-locked in the DB (unlimited now)
//   * a user backs at most ONE caption per photo — voting another moves it
import { runSql } from "./mgmt.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function userToken(email) {
  const gen = await (
    await fetch(`${URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", email }),
    })
  ).json();
  const hashed = gen.hashed_token ?? gen.properties?.hashed_token;
  const v = await (
    await fetch(`${URL}/auth/v1/verify`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: hashed }),
    })
  ).json();
  return v.access_token;
}

const token = await userToken("casey@seed.picoftheweek.test");
const api = (path, opts = {}) =>
  fetch(`${URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });

const [{ id: caseyId }] = await runSql("select id from users where email='casey@seed.picoftheweek.test'");
const [{ id: week }] = await runSql("select id from contest_weeks where status='active'");

// 1. Second photo in the same week is now allowed (limit removed).
const before = (await runSql(`select count(*)::int as n from photos where owner_user_id='${caseyId}' and contest_week_id='${week}' and deleted_at is null`))[0].n;
const p2 = await api("photos", {
  method: "POST",
  body: JSON.stringify({ contest_week_id: week, owner_user_id: caseyId, image_url: "/seed/sample-photo-1.png", first_name: "Casey", captured_at: new Date().toISOString() }),
});
const after = (await runSql(`select count(*)::int as n from photos where owner_user_id='${caseyId}' and contest_week_id='${week}' and deleted_at is null`))[0].n;
console.log(`1. 2nd photo same week allowed (unlimited): ${p2.ok && after === before + 1 ? "PASS" : "FAIL " + p2.status}`);

// 2. Second caption on the same photo is now allowed.
const [{ id: somePhoto }] = await runSql(`select id from photos where owner_user_id <> '${caseyId}' and deleted_at is null limit 1`);
const c1 = await api("captions", { method: "POST", body: JSON.stringify({ photo_id: somePhoto, author_user_id: caseyId, body: "limit test A" }) });
const c2 = await api("captions", { method: "POST", body: JSON.stringify({ photo_id: somePhoto, author_user_id: caseyId, body: "limit test B" }) });
console.log(`2. 2nd caption same photo allowed (unlimited): ${c1.ok && c2.ok ? "PASS" : "FAIL " + c1.status + "/" + c2.status}`);

// 3. One vote per photo: vote caption A, then B -> only B holds Casey's vote.
const targets = await runSql(`select id from captions where photo_id='${somePhoto}' and author_user_id <> '${caseyId}' and deleted_at is null limit 2`);
if (targets.length < 2) {
  console.log("3. SKIPPED (need 2 captions by others on one photo)");
} else {
  const [A, B] = targets;
  await api("caption_votes", { method: "POST", body: JSON.stringify({ caption_id: A.id, voter_user_id: caseyId }) });
  const afterA = (await runSql(`select count(*)::int as n from caption_votes where voter_user_id='${caseyId}' and caption_id='${A.id}'`))[0].n;
  await api("caption_votes", { method: "POST", body: JSON.stringify({ caption_id: B.id, voter_user_id: caseyId }) });
  const stillA = (await runSql(`select count(*)::int as n from caption_votes where voter_user_id='${caseyId}' and caption_id='${A.id}'`))[0].n;
  const onB = (await runSql(`select count(*)::int as n from caption_votes where voter_user_id='${caseyId}' and caption_id='${B.id}'`))[0].n;
  const totalOnPhoto = (await runSql(`select count(*)::int as n from caption_votes v join captions c on c.id=v.caption_id where c.photo_id='${somePhoto}' and v.voter_user_id='${caseyId}'`))[0].n;
  console.log(`3. Vote moves to new caption (A had ${afterA} -> ${stillA}, B has ${onB}, total on photo ${totalOnPhoto}): ${stillA === 0 && onB === 1 && totalOnPhoto === 1 ? "PASS" : "FAIL"}`);
}

// Cleanup
await runSql(`delete from caption_votes where voter_user_id='${caseyId}' and caption_id in (select id from captions where photo_id='${somePhoto}')`);
await runSql(`delete from captions where author_user_id='${caseyId}' and body like 'limit test%'`);
await runSql(`delete from photos where owner_user_id='${caseyId}' and contest_week_id='${week}' and id not in (select id from photos where owner_user_id='${caseyId}' and contest_week_id='${week}' order by created_at limit 1)`);
console.log("Cleaned up test artifacts.");
