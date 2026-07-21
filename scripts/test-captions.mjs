// Verifies caption RLS + constraints with a REAL user JWT:
//   * a user can upvote someone else's caption (count goes up, has_voted true)
//   * a user CANNOT vote on their own caption (RLS blocks it)
//   * one caption per user per photo (unique index blocks a 2nd)
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

function rest(token) {
  return (path, opts = {}) =>
    fetch(`${URL}/rest/v1/${path}`, {
      ...opts,
      headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts.headers ?? {}) },
    });
}

const token = await userToken("sam@seed.picoftheweek.test");
const api = rest(token);
const [{ id: samId }] = await runSql("select id from users where email='sam@seed.picoftheweek.test'");

// A caption NOT authored by Sam, that Sam hasn't voted on.
const [other] = await runSql(`
  select c.id, c.photo_id from captions c
  where c.author_user_id <> '${samId}' and c.deleted_at is null
    and not exists (select 1 from caption_votes v where v.caption_id=c.id and v.voter_user_id='${samId}')
  limit 1`);

// 1. Vote on someone else's caption.
const before = (await runSql(`select count(*)::int as n from caption_votes where caption_id='${other.id}'`))[0].n;
const voteRes = await api("caption_votes", {
  method: "POST",
  body: JSON.stringify({ caption_id: other.id, voter_user_id: samId }),
});
const after = (await runSql(`select count(*)::int as n from caption_votes where caption_id='${other.id}'`))[0].n;
console.log(`1. Vote on other's caption: ${voteRes.ok && after === before + 1 ? "PASS" : "FAIL " + voteRes.status}`);

// 1b. has_voted reflected in the RPC for Sam.
const rpc = await (
  await api(`rpc/get_photo_captions`, { method: "POST", body: JSON.stringify({ p_photo_id: other.photo_id }) })
).json();
const row = rpc.find((r) => r.id === other.id);
console.log(`1b. RPC has_voted true for voter: ${row?.has_voted === true ? "PASS" : "FAIL"}`);

// 2. Vote on OWN caption -> blocked by RLS.
const [own] = await runSql(`select id from captions where author_user_id='${samId}' and deleted_at is null limit 1`);
const selfVote = await api("caption_votes", {
  method: "POST",
  body: JSON.stringify({ caption_id: own.id, voter_user_id: samId }),
});
const selfCount = (await runSql(`select count(*)::int as n from caption_votes where caption_id='${own.id}' and voter_user_id='${samId}'`))[0].n;
console.log(`2. Self-vote blocked: ${!selfVote.ok && selfCount === 0 ? "PASS" : "FAIL " + selfVote.status}`);

// 3. One caption per user per photo. Find a photo Sam hasn't captioned.
const [freshPhoto] = await runSql(`
  select p.id from photos p
  where p.deleted_at is null
    and not exists (select 1 from captions c where c.photo_id=p.id and c.author_user_id='${samId}' and c.deleted_at is null)
  limit 1`);
const c1 = await api("captions", {
  method: "POST",
  body: JSON.stringify({ photo_id: freshPhoto.id, author_user_id: samId, body: "test caption one" }),
});
const c2 = await api("captions", {
  method: "POST",
  body: JSON.stringify({ photo_id: freshPhoto.id, author_user_id: samId, body: "test caption two" }),
});
console.log(`3. One caption per photo (1st ok, 2nd blocked): ${c1.ok && !c2.ok ? "PASS" : "FAIL " + c1.status + "/" + c2.status}`);

// Cleanup test artifacts.
await runSql(`delete from caption_votes where voter_user_id='${samId}' and caption_id='${other.id}'`);
await runSql(`delete from captions where author_user_id='${samId}' and photo_id='${freshPhoto.id}' and body like 'test caption%'`);
console.log("Cleaned up test artifacts.");
