# Pic of the Week — Product Requirements Document

Version 1.0 · Draft for V1 build

## 1. Overview & Concept

Pic of the Week (POW) is a weekly photo contest web app that recreates the honesty of early social media. Anyone can submit **one candid, camera-captured photo per week**. Photos are ranked not by likes or a black-box algorithm, but by **average view time** — how long people actually look at a photo, capped at 2 minutes per view to prevent tab-leaving abuse.

Each contest runs **Wednesday to Wednesday**, so the weekend sits at the emotional center of the week. Past weeks are archived and browsable at any time. Within a photo, a **separate caption contest** lets people submit and vote on captions, with the top-voted caption displayed beneath the photo.

The whole experience is intentionally low-friction: a lightweight email account (magic link, no password), instant posting, camera-only capture (no gallery uploads), and a Polaroid-styled visual identity.

## 2. Goals & Non-Goals

**Goals**
- Make ranking feel earned and honest — no algorithmic boosting, no sponsored content, no gaming via bots (view-time cap + per-account submission limits).
- Keep the barrier to participation as low as possible while still preventing spam (one lightweight email account, no profile setup).
- Preserve the "caught in the moment" feel by requiring in-browser camera capture instead of file upload.
- Ship a V1 that's genuinely usable and deployable to a live domain, then layer on the deferred features (leaderboard, social export) later.

**Non-Goals (V1)**
- No social graph (follows, DMs, comment threads beyond captions).
- No algorithmic feed personalization.
- No native mobile app — this is a mobile-first responsive web app.
- No pre-publication moderation queue — posting stays instant; moderation is reactive (report + admin review).
- No monetization/ads in V1.

## 3. User Roles

| Role | Capabilities |
|---|---|
| **Visitor (not signed in)** | Browse current week, browse archive, view photos/captions. Cannot submit a photo, submit a caption, or vote. |
| **Account holder (signed in via magic link)** | Everything a visitor can do, plus: submit one photo per contest week, submit one caption per photo, vote on captions (not their own), report a photo/caption. |
| **Admin** | Password-protected dashboard. Views reported content, deletes photos/captions, can force-close/roll a contest week if needed. |

Accounts require only an email address — no display name, avatar, or profile setup. The "First Name" + "Initial" fields collected during photo submission (see §6.3) are per-submission display fields, not account profile fields, so the same account can show a different display name on different weeks if desired (or reuse the same one — not enforced).

## 4. Core Mechanics

### 4.1 Contest week cycle
- A contest week runs **Wednesday 00:00 to the following Wednesday 00:00**, anchored to a single fixed timezone: **America/New_York**. All users see the same countdown regardless of their local timezone. (This is a config value, not hardcoded logic — easy to change later.)
- When a week ends, it is immediately archived (read-only) and a new contest week begins.
- The home screen shows a countdown ("36 hrs left") while the current week is active.

### 4.2 Submission rules
- One photo per account per contest week. Enforced server-side against the authenticated user id (not device/cookie — see PRD §9 for why).
- Photos must be captured live via the device camera in-browser (`getUserMedia`); no file picker / gallery upload path exists in the UI.
- On submission the user provides: a **First Name** (required), an optional **Initial**, and can add a **caption** immediately (or add one later — the caption box is present at submission but not required to submit).
- Once submitted, a photo cannot be edited, only deleted by its owner or an admin.

### 4.3 Ranking / view-time algorithm
- Every time a signed-in user views a photo, the client tracks how long the photo is in the visible/focused viewport (using the Page Visibility API + intersection observer), capped at **120 seconds** per view session.
- **Anti-gaming rule:** for each (user, photo) pair, only the **maximum** single capped view session is kept — not a running sum. This stops a user from padding a photo's average by repeatedly re-viewing it.
- A photo's **score** = mean of all stored per-user max-view-time values for that photo.
- Within the current week, photos are sorted by score descending. Ties broken by earliest submission time.
- A photo's ranking badge/tag is computed as:
  - **Leading** — current #1 by score.
  - **Trending** — score has risen significantly in the last few hours relative to its view count (simple heuristic: top-quartile score velocity; exact thresholds are an implementation detail Claude Code should choose and document, not a user-facing promise).
  - **New** — submitted within the last 24 hours and not yet Leading/Trending.
  - A photo shows at most one tag at a time, prioritized Leading > Trending > New.
- **Current-week browse mixing:** the home feed alternates between top-ranked-so-far photos and recently-submitted photos as the user swipes/pages through, so new submissions get visibility instead of being buried under early leaders. Exact interleave ratio (e.g. show 1 recent photo per 3 top-ranked) is an implementation detail.

### 4.4 Caption contest
- Each photo has its own caption contest, separate from the photo's own view-time ranking.
- Any signed-in account may submit **one caption per photo** (not their own submitted photo — no restriction on captioning others' photos in the same week).
- Any signed-in account may **upvote** captions on a photo, once per caption, excluding their own caption. Captions are listed ranked by vote count (see "View Captions" screen).
- The single top-voted caption is displayed directly beneath the photo on the main photo view. If a photo has no captions yet, no caption line is shown.
- Caption text has a character limit (per Figma design, 150 characters — confirm exact figure against the "150"/"139" counters visible in the `Write Caption` and `View Captions` frames; the Figma spec is the source of truth for the exact number).

### 4.5 Archive
- Every past contest week remains browsable indefinitely via the calendar/week controller at the top of the home screen.
- Archived weeks are read-only: no new photos, captions, or votes; view-time tracking stops counting toward score once a week is archived (viewing an archived photo should not silently keep affecting its historical score).

### 4.6 Sharing
- A "share" action copies a direct link to that photo (deep link to `week + photo id`) to the clipboard and shows a "Link copied to clipboard" confirmation toast, per the `Home (This Week)` share-confirmation frame.
- No image/social-card export in V1 (deferred — see §10).

## 5. Anti-Abuse & Enforcement (design rationale)

The original concept called for zero accounts. In practice, "one submission per device per week" and "average view time per unique viewer" both require *some* notion of identity that survives across sessions and can't be trivially reset (clearing cookies, incognito mode). The simplest mechanism that satisfies both without heavy friction is a **lightweight magic-link email account**:
- No password to manage, no profile to fill out — sign-in is "enter email, click link."
- Gives a stable id to key submission-limits and view-time records off of.
- This is a deliberate scope change from "instant, no accounts" to "one email, still instant." It should be called out clearly in any marketing copy so early users aren't surprised.

This does **not** fully prevent someone from using multiple email addresses to submit multiple photos or pad view time. That's an accepted, documented risk for V1 (see §9), not something V1 engineering needs to solve (e.g. no phone verification, no CAPTCHA in V1).

## 6. Flow-by-Flow Functional Spec

Each flow below references the Figma frame IDs in file `MkEBaZ8RVFsaZ6r4eTDsJh` for exact visual spec — see `CLAUDE_CODE_PROMPT.md` for the fetch instructions.

### 6.1 Home / Main Navigation Flow
Frames: `191:1374` / `191:3952` (This Week, Pic #1), `191:1509` (Pic #26 — mid-week deeper into the ranking), `191:3552` (Last Week), `191:3783` / `191:3870` (arbitrary archived week).
- Top nav shows the "Pic of the Week" wordmark, a pill showing either the live countdown ("36 hrs left") for the current week or the date range (e.g. "Dec 2 – 9") for archived weeks, and an entries count.
- Below that, a horizontally-scrollable **week/calendar controller** for switching between weeks (current week highlighted differently from past weeks — see `Property 1=This Week` vs `Property 1=Previous Week` component variants).
- Center: the **Polaroid Photo** component — the photo itself styled like a physical Polaroid print (white border, slight rotation/shadow per design), the rank number, the optional New/Trending/Leading tag, the top caption, the submitter's first name + initial, and the photo's captured timestamp.
- Bottom: the **Tool Container** — left/right arrow navigation between photos in the current ranking, plus icon actions (comment/captions, share, add/submit). Swipe gesture support on the photo itself is equivalent to using the arrows.
- Bottom tab bar (`Tabs Mode Compact`) for top-level navigation (home, submit, captions, etc. — confirm exact tab set against the Figma component instance).

### 6.2 Submit Photo Flow
Frames: `191:1262` (Take a photo) → `191:1336` (Confirm Photo) → `191:1450` (Add details).
1. **Take a photo** — live camera viewfinder fills the frame; a circular shutter button captures a still. No gallery/upload affordance exists.
2. **Confirm Photo** — shows the captured still with **Retake** and **Next** actions.
3. **Add details** — small preview thumbnail of the photo, **First Name** field (required), **Initial** field (optional), **caption** field (optional at this step), **Submit** button.
4. On submit: validate the account hasn't already submitted this week (server-side check, not just client-side), persist the photo + metadata, redirect to the home view showing the new submission.
5. If not signed in when starting this flow, prompt for magic-link email sign-in first, then resume the flow after the user clicks the emailed link.

### 6.3 Caption Flow
Frames: `191:1770` (View Captions) → `191:1995` / `191:2108` (View Captions, voted state) and `191:1889` (Write Caption).
- **View Captions**: shows the photo thumbnail, then a ranked list of captions each with rank number, caption text, vote-count badge, and up/down arrow controls. A voted-state variant shows the user's vote reflected (arrow highlighted / disabled from re-voting the same direction). A text field at the bottom lets the signed-in user submit their own caption directly from this screen, with a live character counter.
- **Write Caption**: a focused, keyboard-up state of the same text field for composing a caption (mobile keyboard shown per the `Keyboard` instance in the frame) with the char counter.

### 6.4 Archive / Week Browsing
Covered by the Home flow's calendar controller (§6.1) — same screen template, different week's data, read-only interactions (no submit CTA surfaced for past weeks, or the submit CTA is present but disabled/redirects to the current week).

### 6.5 Share Flow
Frames: `191:3627` / `191:3702` (Home, This Week, with "Link copied to clipboard" toast).
- Tapping the share icon in the Tool Container copies a deep link and shows a transient confirmation toast (as in `191:3702`'s "Frame 48" — checkmark + "Link copied to clipboard").

## 7. Data Model (plain-English overview)

Exact SQL/schema lives in `CLAUDE_CODE_PROMPT.md`; this is the conceptual shape:

- **users** — id, email, created_at. (Supabase Auth handles the credential/session side; this is the app-facing profile row.)
- **contest_weeks** — id, starts_at, ends_at, status (active/archived).
- **photos** — id, contest_week_id, owner_user_id, image_url, first_name, initial (nullable), captured_at, created_at, deleted_at (nullable, for admin/owner soft-delete).
- **captions** — id, photo_id, author_user_id, body, created_at, deleted_at (nullable).
- **caption_votes** — id, caption_id, voter_user_id, created_at. Unique on (caption_id, voter_user_id).
- **view_sessions** — id, photo_id, viewer_user_id, seconds_viewed (0–120), created_at. On new session for an existing (photo_id, viewer_user_id) pair, only keep/update if the new value is greater than the stored max (implements the anti-gaming rule in §4.3).
- **reports** — id, target_type (photo/caption), target_id, reporter_user_id, reason (optional text), created_at, resolved_at (nullable), resolved_by (admin identifier).

## 8. Moderation

- Every photo and caption has a **report** affordance visible to signed-in users.
- Reports land in an **admin dashboard** (separate route, password-protected — simplest viable option is a single shared admin password stored as an environment variable, not a full RBAC system, for V1).
- Admin can view reported content with context, delete the photo/caption (soft delete), and mark the report resolved.
- No automated image moderation (e.g. NSFW detection API) in V1 — flagged as a fast-follow if abuse becomes real (see §10).

## 9. Non-Functional Requirements & Risks

- **Mobile-first**: design is authored at 402px width; layout should be fluid but the Figma spec is the source of truth for the mobile breakpoint. Wider viewports center the same card-width layout rather than reflowing into a desktop-specific design.
- **Performance**: photo list should paginate/virtualize rather than loading a full week's photos at once as entry counts grow (design mockups show entry counts in the thousands, e.g. "2.84k Entries").
- **Privacy**: only an email address is collected; no other PII is required. Location/EXIF data from captured photos should not be stored or displayed.
- **Known limitation — candid enforcement**: requiring in-browser camera capture prevents uploading an existing file, but does not prevent someone from photographing a screen or a printed photo to fake candidness. This is accepted as "good enough" friction, not a hard guarantee, matching the product's honor-system philosophy elsewhere (e.g. view-time cap, submission limit).
- **Known limitation — multi-account abuse**: a determined user can create multiple email accounts to submit more than one photo/week or pad view-time averages. V1 does not add phone verification or CAPTCHA to close this gap; revisit if real abuse is observed.
- **Email deliverability**: magic-link sign-in depends on transactional email actually reaching the inbox promptly. Deployment guide covers configuring Supabase's email settings; a real SMTP provider (vs. Supabase's default limited dev email) is recommended before public launch.

## 10. V1 Scope Summary

**In scope (V1):**
Home feed + week/archive navigation, magic-link auth, submit flow (camera-only), view-time tracking + ranking + tags, caption submit/vote, link-share, report button + admin dashboard.

**Explicitly deferred (post-V1):**
- All-time **Leaderboard** screen (ranked by cumulative/all-time view time — see Figma `Page 3`, frame `135:1918`).
- Styled **social-share image export** (Instagram/Facebook-style card generation — Figma `Page 3`, frame `135:1880`).
- Automated image content moderation.
- Any richer profile/account features beyond email + magic link.

## 11. Open Questions for Later Phases (not blocking V1)

- Exact "Trending" scoring heuristic — needs real usage data to tune sensibly; ship a reasonable default and revisit.
- Whether admin auth should upgrade from a single shared password to per-admin accounts if more than one person needs dashboard access.
- Whether archived-week photos should support late caption voting or freeze captions too (current spec: everything freezes on archive).
