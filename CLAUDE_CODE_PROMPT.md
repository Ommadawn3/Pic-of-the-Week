# Build Prompt: Pic of the Week

Copy everything below this line into a fresh Claude Code session (in the repo you want the project built in). It is self-contained.

---

## What we're building

**Pic of the Week** is a weekly photo contest web app. Anyone with a lightweight email account can submit **one candid, camera-captured photo per week** (Wednesday–Wednesday). Photos are ranked by **average view time** (capped at 2 minutes per view, only the viewer's single best/longest session counts) instead of likes or an algorithm. Each photo also has its own **caption contest**: users submit and upvote captions, and the top-voted caption shows beneath the photo. Photos are styled like Polaroid prints. Full product spec: read `PRD.md` in this repo before starting (it's already in the project root) — it is the source of truth for every rule below; if anything here and `PRD.md` conflict, `PRD.md` wins.

## Design source

Figma file: `https://www.figma.com/design/MkEBaZ8RVFsaZ6r4eTDsJh/POD` (file key `MkEBaZ8RVFsaZ6r4eTDsJh`).

Use the Figma MCP tools (`get_design_context`, `get_screenshot`) to pull the real spec (colors, spacing, typography, component states) for each flow **at the start of the phase that needs it** — don't try to load the whole file into context up front. Frame IDs by flow:

| Flow | Frame IDs |
|---|---|
| Home / navigation | `191:1374` (This Week, Pic #1), `191:1509` (Pic #26), `191:3552` (Last Week), `191:3783` / `191:3870` (archived week) |
| Submit photo | `191:1262` (Take a photo) → `191:1336` (Confirm Photo) → `191:1450` (Add details) |
| Captions | `191:1770` (View Captions) → `191:1995` / `191:2108` (View Captions, voted) → `191:1889` (Write Caption) |
| Share confirmation | `191:3702` (link-copied toast) |

Reusable component instances to pull once and reuse across screens: `Standard Nav`, `Home Nav`, `Calendar Controller` (variants `Property 1=This Week`, `Property 1=Previous Week`), `Polaroid Photo`, `Tool Container`, `Tabs Mode Compact`, `Status Bar`, `Text Field`.

**Do not** build the all-time Leaderboard (`Page 3`, frame `135:1918`) or the Instagram/Facebook social-share export card (`Page 3`, frame `135:1880`) — both are explicitly out of scope for this build.

## Tech stack (required, not optional)

- **Next.js** (App Router, TypeScript) for the frontend + API routes.
- **Supabase**: Postgres for data, Supabase Storage for photo images, Supabase Auth (magic link / passwordless email) for accounts, Row Level Security for authorization.
- **Vercel** as the deploy target (the deployment steps for this are in `DEPLOYMENT_SETUP.md`, also already in this repo — don't redo that research, just make the app deployable to it: standard Next.js app, no non-Vercel-compatible runtime assumptions).
- Styling: your choice of Tailwind CSS (recommended, fastest match to a Figma spec) — use design tokens (colors/spacing/type scale) pulled from Figma rather than hardcoding ad hoc values.

## Architecture requirement: Atomic Design

Organize all UI components under this structure, mapped to the Figma component set:

```
components/
  atoms/        # Button, TextField, Avatar/Initial badge, Tag pill (New/Trending/Leading), Icon, StatusBar
  molecules/     # CalendarWeekPill, VoteControl (up/down + count), CaptionRow, PolaroidFrame (photo + border/shadow chrome only)
  organisms/     # PolaroidPhotoCard (full card: photo + rank + tag + caption + author + timestamp), CalendarController, ToolContainer, CaptionList, CameraCapture
  templates/     # HomeTemplate, SubmitFlowTemplate, CaptionFlowTemplate
app/             # Next.js routes/pages composing templates
```

Don't skip straight to page-level components — the Figma file reuses the same instances (Polaroid Photo, Tool Container, etc.) across many screens specifically so they should be built once as organisms and reused.

## Data model (create as a Supabase migration)

```sql
create table users (
  id uuid primary key references auth.users(id),
  email text not null,
  created_at timestamptz not null default now()
);

create table contest_weeks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('active', 'archived')) default 'active'
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  contest_week_id uuid not null references contest_weeks(id),
  owner_user_id uuid not null references users(id),
  image_url text not null,
  first_name text not null,
  initial text,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table captions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references photos(id),
  author_user_id uuid not null references users(id),
  body text not null check (char_length(body) <= 150),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table caption_votes (
  id uuid primary key default gen_random_uuid(),
  caption_id uuid not null references captions(id),
  voter_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (caption_id, voter_user_id)
);

create table view_sessions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references photos(id),
  viewer_user_id uuid not null references users(id),
  seconds_viewed numeric not null check (seconds_viewed >= 0 and seconds_viewed <= 120),
  created_at timestamptz not null default now(),
  unique (photo_id, viewer_user_id)
);
-- On new view, UPSERT and only overwrite seconds_viewed if the new value is greater
-- (this is the anti-gaming rule: only the viewer's single best session counts)

create table reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('photo', 'caption')),
  target_id uuid not null,
  reporter_user_id uuid not null references users(id),
  reason text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);
```

Add Row Level Security policies so: anyone (including anonymous) can `select` non-deleted photos/captions in archived or active weeks; only the authenticated owner can insert a photo (and only if they have no other non-deleted photo in the current active `contest_weeks` row); only authenticated users can insert captions/votes/view_sessions/reports; users can only delete their own photos/captions (admin deletes go through a service-role server action, not client RLS).

## Business rules to enforce server-side (not just in the UI)

1. One photo per `owner_user_id` per active `contest_week_id` — check on the server before insert, return a clear error if violated.
2. `seconds_viewed` is clamped to [0, 120] server-side regardless of what the client reports.
3. A `view_sessions` row is upserted such that `seconds_viewed` only ever increases for a given (photo, viewer) pair — never overwritten with a lower value.
4. A photo's score = `avg(seconds_viewed)` across its `view_sessions` rows. Compute this in a query/view, not by denormalizing into `photos` (keep it simple; add caching only if it becomes a real perf problem).
5. Tag priority: Leading (rank #1 in current week by score) > Trending (your own reasonable heuristic — e.g. score velocity in the top quartile over the last few hours — document whatever threshold you pick in a code comment) > New (submitted in the last 24h). Show at most one tag.
6. Contest week rollover: an active `contest_weeks` row transitions to `archived` and a new one is created every Wednesday 00:00 **America/New_York**. Implement via a Vercel Cron job hitting an API route (not a client-side timer) — see `DEPLOYMENT_SETUP.md` for wiring it up.
7. Caption char limit: 150 characters (matches the DB constraint above and the Figma character-counter UI).
8. A user cannot vote on their own caption; one vote per (caption, voter).

## Build order — ship in these atomic phases, in order

Treat each phase as a complete, independently deployable unit. Don't start phase N+1 until phase N's acceptance criteria pass. Re-fetch the relevant Figma frames (via `get_design_context`) at the start of each phase rather than up front.

**Phase 1 — Scaffold**
Next.js + TypeScript + Tailwind project, Supabase project wired up (env vars, client), the SQL migration above applied, deployed to Vercel showing a placeholder page.
*Acceptance:* `vercel.app` URL loads, Supabase connection verified (e.g. a test query succeeds).

**Phase 2 — Design system atoms/molecules**
Build the atoms/molecules listed above, matching Figma tokens (color, type, spacing, corner radius, shadows) pulled via `get_design_context`.
*Acceptance:* a components/style-guide route renders every atom/molecule in its documented states.

**Phase 3 — Home feed (read-only, seeded data)**
`HomeTemplate` with `Home Nav`, `Calendar Controller`, `PolaroidPhotoCard` organism, `Tool Container` (arrow nav wired to a hardcoded/seeded list of photos). Auth not required yet to browse.
*Acceptance:* seed 5–10 fake photos across 2 fake weeks in Supabase; home page renders them, week switcher and left/right photo navigation both work.

**Phase 4 — Auth**
Supabase magic-link sign-in flow (email input → "check your email" state → session established after clicking the link → `users` row created on first sign-in).
*Acceptance:* a real email round-trip works locally (use Supabase's dev email capture or a real provider — see `DEPLOYMENT_SETUP.md`), session persists across reload.

**Phase 5 — Submit flow**
`Take a photo` (camera capture via `getUserMedia`, no file input) → `Confirm Photo` (retake/next) → `Add details` (first name, initial, optional caption, submit) → server enforces one-per-week-per-account → uploads image to Supabase Storage → creates `photos` row → redirects to home showing the new submission.
*Acceptance:* submitting twice in the same week from the same account is rejected with a clear message; the photo appears immediately in the home feed after submit.

**Phase 6 — View-time tracking + ranking + tags**
Client-side visibility/focus tracking per photo card, capped and upserted per the rules above; server-side score computation; sort order and Leading/Trending/New tag rendering on the home feed.
*Acceptance:* viewing a photo for >2 minutes only ever records 120s; re-viewing the same photo doesn't raise its score above the single best session; the top-scored photo shows the Leading tag.

**Phase 7 — Caption flow**
`View Captions` (ranked list + vote controls + inline caption composer) and `Write Caption` screens; top-voted caption surfaced on the home card.
*Acceptance:* submitting, voting, and re-voting (blocked) all work; the top caption updates the home card immediately.

**Phase 8 — Archive + share**
Calendar controller fully wired to past (archived) weeks, read-only interactions; share icon copies a deep link and shows the "Link copied to clipboard" toast per frame `191:3702`.
*Acceptance:* switching to a past week shows that week's frozen data with no submit/vote affordances active; share produces a working deep link that reopens the same photo.

**Phase 9 — Reporting + admin dashboard**
Report action on photos/captions (writes to `reports`); `/admin` route gated by a single shared password (env var), listing open reports with delete actions (soft delete) and a resolve action.
*Acceptance:* a reported item appears in `/admin`; deleting it removes it from the public feed; the dashboard is unreachable without the admin password.

**Phase 10 — Polish + production deploy**
Final visual polish pass against Figma (Polaroid styling/shadows/rotation, empty states, error states, loading states), swipe gesture support on mobile in addition to arrow buttons, production deploy to Vercel with the custom domain from `DEPLOYMENT_SETUP.md` connected.
*Acceptance:* the checklist at the end of `DEPLOYMENT_SETUP.md` passes end-to-end on a real phone (iOS Safari + Android Chrome at minimum, for camera permission behavior).

## What's explicitly out of scope for this build

All-time Leaderboard screen, styled social-share image export, automated image content moderation, any account features beyond email + magic link. Don't build these even if you see them in the Figma file — flag them back to the user instead if asked to include them.
