// Removes the seeded demo content (photos whose image_url points at
// /seed/..., plus the fake accounts and their engagement) while leaving every
// genuinely uploaded photo and real user account untouched.
//
// Use this instead of truncating the tables once real people are on the site.
//   node scripts/clear-demo-data.mjs
import { runSql } from "./mgmt.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_EMAIL_SUFFIX = "@seed.picoftheweek.test";

const before = await runSql(`
  select
    (select count(*) from photos where deleted_at is null) as photos,
    (select count(*) from photos where deleted_at is null and image_url like '/seed/%') as seed_photos,
    (select count(*) from captions where deleted_at is null) as captions,
    (select count(*) from contest_weeks) as weeks
`);
console.log("Before:", before[0]);

// Order matters: children before parents (foreign keys).
await runSql(`
  delete from caption_votes v
  using captions c
  where v.caption_id = c.id
    and (c.photo_id in (select id from photos where image_url like '/seed/%')
         or v.voter_user_id in (select id from users where email like '%${SEED_EMAIL_SUFFIX}'))
`);

await runSql(`
  delete from captions
  where photo_id in (select id from photos where image_url like '/seed/%')
     or author_user_id in (select id from users where email like '%${SEED_EMAIL_SUFFIX}')
`);

await runSql(`
  delete from view_sessions
  where photo_id in (select id from photos where image_url like '/seed/%')
     or viewer_user_id in (select id from users where email like '%${SEED_EMAIL_SUFFIX}')
`);

await runSql(`
  delete from reports
  where target_id in (select id from photos where image_url like '/seed/%')
     or reporter_user_id in (select id from users where email like '%${SEED_EMAIL_SUFFIX}')
`);

await runSql(`delete from photos where image_url like '/seed/%'`);

// Drop contest weeks that are now empty AND aren't the active one, so the week
// navigator doesn't show hollow archived weeks.
const emptyWeeks = await runSql(`
  delete from contest_weeks cw
  where cw.status = 'archived'
    and not exists (select 1 from photos p where p.contest_week_id = cw.id)
  returning cw.id
`);

// Finally remove the fake auth accounts (cascades to public.users).
const seedUsers = await runSql(
  `select id, email from users where email like '%${SEED_EMAIL_SUFFIX}'`,
);
for (const u of seedUsers) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  console.log(`  removed seed account ${u.email}: ${res.ok ? "ok" : "FAILED " + res.status}`);
}

const after = await runSql(`
  select
    (select count(*) from photos where deleted_at is null) as photos,
    (select count(*) from captions where deleted_at is null) as captions,
    (select count(*) from contest_weeks) as weeks,
    (select count(*) from users) as users
`);
console.log(`Removed ${emptyWeeks.length} empty archived week(s).`);
console.log("After:", after[0]);

const survivors = await runSql(`
  select u.email, p.first_name, p.created_at
  from photos p join users u on u.id = p.owner_user_id
  where p.deleted_at is null order by p.created_at
`);
console.log("Remaining real photos:");
console.table(survivors);
