// Seeds demo data over HTTPS: a few auth users (via the admin API), one active
// + one archived contest week, and photos with captions/votes/view-time
// sessions so ranking is visible. Safe to re-run: clears app tables first.
//
// Needs SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL, and
// SUPABASE_SERVICE_ROLE_KEY in .env.local.
import { runSql, adminBase, serviceKey } from "./mgmt.mjs";

const SEED_USERS = [
  { email: "alex@seed.picoftheweek.test", first: "Alex", initial: "B" },
  { email: "sam@seed.picoftheweek.test", first: "Sam", initial: "R" },
  { email: "jordan@seed.picoftheweek.test", first: "Jordan", initial: null },
  { email: "casey@seed.picoftheweek.test", first: "Casey", initial: "M" },
  { email: "riley@seed.picoftheweek.test", first: "Riley", initial: "T" },
];

async function adminApi(path, options = {}) {
  const res = await fetch(`${adminBase}/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ensureUsers() {
  const existing = await adminApi("users?per_page=200");
  const byEmail = new Map((existing.users ?? []).map((u) => [u.email, u.id]));
  const out = [];
  for (const u of SEED_USERS) {
    let id = byEmail.get(u.email);
    if (!id) {
      const created = await adminApi("users", {
        method: "POST",
        body: JSON.stringify({ email: u.email, email_confirm: true }),
      });
      id = created.id;
      console.log(`  created auth user ${u.email}`);
    }
    out.push({ ...u, id });
  }
  return out;
}

// --- tiny SQL literal helpers -------------------------------------------
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString();

async function main() {
  console.log("Ensuring seed auth users...");
  const users = await ensureUsers();

  console.log("Clearing existing app data...");
  await runSql(
    "truncate reports, view_sessions, caption_votes, captions, photos, contest_weeks restart identity cascade;",
  );

  console.log("Inserting weeks and photos...");
  const weekRows = await runSql(`
    insert into contest_weeks (starts_at, ends_at, status) values
      (${q(daysAgo(5))}, ${q(hoursAgo(-36))}, 'active'),
      (${q(daysAgo(12))}, ${q(daysAgo(5))}, 'archived')
    returning id, status;
  `);
  const activeId = weekRows.find((w) => w.status === "active").id;
  const archivedId = weekRows.find((w) => w.status === "archived").id;

  const IMG = "/seed/sample-photo-1.png";
  const captionsPool = [
    // Max-length 3-line caption (matches the Figma multi-line frame) so
    // wrapping gets exercised on both the polaroid card and the captions list.
    "Hipster ipsum tattooed brunch I'm baby. Hashtag readymade locavore church-key hipster blog flannel ugh",
    "Pirate arrgh bounty warp jack",
    "meat lovers buffalo",
    "I'm so cool",
    "Local man discovers joy",
    "Peak performance",
  ];

  // Active week: 5 photos with descending view-time so ranks are clear.
  const activePhotos = [
    { user: 0, capturedHrs: 30, avgViews: [95, 88, 110, 102, 76] },
    { user: 1, capturedHrs: 20, avgViews: [70, 65, 80] },
    { user: 2, capturedHrs: 10, avgViews: [45, 52] },
    { user: 3, capturedHrs: 2, avgViews: [30] },
    { user: 4, capturedHrs: 0.5, avgViews: [] }, // brand new, no views -> "New" tag
  ];

  for (let i = 0; i < activePhotos.length; i++) {
    const p = activePhotos[i];
    const owner = users[p.user];
    const [photo] = await runSql(`
      insert into photos (contest_week_id, owner_user_id, image_url, first_name, initial, captured_at, created_at)
      values (${q(activeId)}, ${q(owner.id)}, ${q(IMG)}, ${q(owner.first)}, ${q(owner.initial)}, ${q(hoursAgo(p.capturedHrs))}, ${q(hoursAgo(p.capturedHrs))})
      returning id;
    `);
    const photoId = photo.id;

    for (let vi = 0; vi < p.avgViews.length; vi++) {
      const viewer = users[(p.user + vi + 1) % users.length];
      await runSql(`
        insert into view_sessions (photo_id, viewer_user_id, seconds_viewed)
        values (${q(photoId)}, ${q(viewer.id)}, ${p.avgViews[vi]});
      `);
    }

    const [c1] = await runSql(`
      insert into captions (photo_id, author_user_id, body)
      values (${q(photoId)}, ${q(users[(p.user + 1) % users.length].id)}, ${q(captionsPool[i % captionsPool.length])})
      returning id;
    `);
    const [c2] = await runSql(`
      insert into captions (photo_id, author_user_id, body)
      values (${q(photoId)}, ${q(users[(p.user + 2) % users.length].id)}, ${q(captionsPool[(i + 3) % captionsPool.length])})
      returning id;
    `);
    for (let v = 0; v < 3; v++) {
      const voter = users[(p.user + v + 2) % users.length];
      await runSql(`
        insert into caption_votes (caption_id, voter_user_id)
        values (${q(c1.id)}, ${q(voter.id)}) on conflict do nothing;
      `);
    }
    await runSql(`
      insert into caption_votes (caption_id, voter_user_id)
      values (${q(c2.id)}, ${q(users[(p.user + 4) % users.length].id)}) on conflict do nothing;
    `);
  }

  // Archived week: 3 frozen photos.
  for (let i = 0; i < 3; i++) {
    const owner = users[i];
    const [photo] = await runSql(`
      insert into photos (contest_week_id, owner_user_id, image_url, first_name, initial, captured_at, created_at)
      values (${q(archivedId)}, ${q(owner.id)}, ${q(IMG)}, ${q(owner.first)}, ${q(owner.initial)}, ${q(daysAgo(8 - i))}, ${q(daysAgo(8 - i))})
      returning id;
    `);
    await runSql(`
      insert into view_sessions (photo_id, viewer_user_id, seconds_viewed)
      values (${q(photo.id)}, ${q(users[(i + 1) % users.length].id)}, ${60 - i * 10});
    `);
    await runSql(`
      insert into captions (photo_id, author_user_id, body)
      values (${q(photo.id)}, ${q(users[(i + 1) % users.length].id)}, ${q(captionsPool[i])});
    `);
  }

  console.log("Seed complete: 1 active week (5 photos), 1 archived week (3 photos).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
