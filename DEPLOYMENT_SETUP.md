# Deployment Setup — Pic of the Week

Step-by-step instructions to get from code to a live domain. Follow in order — later steps assume earlier ones are done. Run terminal commands from the project root unless noted.

## 0. Prerequisites

You already have Node.js and npm installed (via Homebrew) and the Claude Code CLI installed. Confirm both still work:

```
node -v
npm -v
claude --version
```

## 1. Create the Supabase project

1. Go to `https://supabase.com`, sign in (or create an account), click **New project**.
2. Choose an organization, name the project `pic-of-the-week` (or similar), set a strong database password (save it — you won't see it again), pick a region close to your users, click **Create new project**. Wait a minute or two for provisioning.
3. In the project dashboard, go to **Project Settings → API**. Copy:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (under the same page, keep this secret) → this is `SUPABASE_SERVICE_ROLE_KEY`, used only in server-side code (admin actions, cron rollover), never sent to the browser.
4. Go to **SQL Editor**, paste in the schema from the `CLAUDE_CODE_PROMPT.md` "Data model" section (Claude Code will likely have already applied this as a migration file in the repo — if so, run `supabase db push` instead, see step 1a).

### 1a. (If Claude Code created a `supabase/migrations` folder)
Install the Supabase CLI and link it to your project instead of pasting SQL manually:

```
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>   # ref is in the Supabase project URL
supabase db push
```

## 2. Configure Supabase Auth (magic link)

1. In the Supabase dashboard, go to **Authentication → Providers**, confirm **Email** is enabled and **Confirm email** / passwordless "Magic Link" is on (password sign-up can stay disabled since this app is magic-link-only).
2. Go to **Authentication → URL Configuration**, set:
   - **Site URL**: your production domain once you have it (step 6) — use `http://localhost:3000` for now, you'll update this after the domain is live.
   - **Redirect URLs**: add both `http://localhost:3000/**` (local dev) and your future production domain `https://yourdomain.com/**`.
3. Go to **Authentication → Email Templates → Magic Link**, review the default template. Supabase's built-in email sending has strict rate limits meant for development only — **before real users sign up**, connect a real SMTP provider:
   - Go to **Project Settings → Auth → SMTP Settings**, enable **Custom SMTP**, and fill in credentials from a provider like Resend, Postmark, or SendGrid (all have free tiers sufficient for launch volume). This step can be deferred until just before go-live, but don't skip it — the default sender will silently fail or get rate-limited under real usage.

## 3. Local environment setup

In the project root, create `.env.local` (never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=<from step 1>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from step 1>
SUPABASE_SERVICE_ROLE_KEY=<from step 1>
ADMIN_DASHBOARD_PASSWORD=<pick a strong password for the /admin route>
```

Confirm `.env.local` is listed in `.gitignore` (Next.js's default `.gitignore` already includes it — double check before your first commit).

Run locally:

```
npm install
npm run dev
```

Visit `http://localhost:3000`, confirm the app loads and Supabase connectivity works (whatever the Phase 1 acceptance check in `CLAUDE_CODE_PROMPT.md` specifies).

## 4. Push the code to GitHub

If Claude Code didn't already initialize git:

```
git init
git add .
git commit -m "Initial commit"
```

Create a new repo on GitHub (via `gh repo create` if you have the GitHub CLI, or through github.com), then:

```
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

## 5. Create the Vercel project

1. Go to `https://vercel.com`, sign in with GitHub, click **Add New → Project**, select your repo.
2. Vercel auto-detects Next.js — leave build settings as default.
3. Before deploying, click **Environment Variables** and add the same four variables from your `.env.local` (step 3). Set them for **Production**, **Preview**, and **Development** environments.
4. Click **Deploy**. Wait for the build to finish — you'll get a `*.vercel.app` URL.
5. Visit the `.vercel.app` URL and confirm the app works the same as local.

## 6. Buy and connect a domain

You don't own a domain yet. Two easy options:

**Option A — buy through Vercel (simplest, one less account to manage)**
1. In your Vercel project, go to **Settings → Domains**, type the domain you want, and if it's available Vercel will offer to sell/register it directly, walking you through payment. DNS is automatically configured — nothing else to do.

**Option B — buy elsewhere (Namecheap or Cloudflare), point it at Vercel**
1. Buy the domain at `namecheap.com` or `cloudflare.com` (Cloudflare registrar sells at-cost, no markup, and is a reputable option).
2. Back in Vercel, **Settings → Domains → Add**, type your domain, and Vercel will show you the DNS records to add (typically an `A` record to `76.76.21.21` and/or a `CNAME` for `www`).
3. In your registrar's DNS settings, add exactly those records.
4. DNS propagation can take anywhere from a few minutes to a few hours. Vercel's domain settings page will show a green checkmark once it's verified.

**Name suggestions** (check availability at your registrar of choice): `picofthewk.com`, `pic-of-the-week.com`, `potw.app`, `weeklypic.com`, `thepicoftheweek.com`.

### After the domain is live
Go back to Supabase **Authentication → URL Configuration** (step 2) and update **Site URL** to `https://yourdomain.com`, and confirm the production domain is in **Redirect URLs**. Magic-link emails will break silently if this isn't updated.

## 7. Set up the weekly contest rollover (cron)

The app needs something to flip the active `contest_weeks` row to `archived` and create the next one every Wednesday 00:00 America/New_York. Use Vercel Cron:

1. In the project repo, confirm Claude Code created an API route for this (e.g. `app/api/cron/rollover-week/route.ts`) that performs the rollover using the `SUPABASE_SERVICE_ROLE_KEY`.
2. Add a `vercel.json` at the project root (if not already present):

```json
{
  "crons": [
    { "path": "/api/cron/rollover-week", "schedule": "0 4 * * 3" }
  ]
}
```

   (`0 4 * * 3` = 4:00 UTC every Wednesday, which is midnight America/New_York during EST; adjust to `0 5 * * 3` during EDT/daylight saving, or have the API route itself compute against `America/New_York` rather than relying on the cron's UTC time being exactly right — safer long-term.)
3. Redeploy (`git push`, Vercel auto-deploys) and confirm in Vercel's **Settings → Cron Jobs** tab that the job is registered.
4. You can manually trigger the route once via its URL (with whatever auth/secret header the route expects) to verify it works before waiting for the real schedule.

## 8. Go-live checklist

Before sharing the domain publicly, verify:

- [ ] Custom SMTP is configured (step 2) — magic-link emails arrive within a few seconds, not stuck in spam.
- [ ] Sign in end-to-end on a real phone: email → click link → session persists.
- [ ] Camera capture works on **iOS Safari** and **Android Chrome** — camera permission prompt appears, capture works, no fallback to a file picker.
- [ ] Submitting a second photo in the same week from the same account is correctly rejected.
- [ ] View-time tracking caps at 120 seconds and re-viewing doesn't inflate a photo's score (spot-check by viewing a test photo twice).
- [ ] Caption submit, vote, and duplicate-vote-block all work.
- [ ] Archive/week switching shows frozen past-week data with no submit/vote affordances.
- [ ] Share button copies a working deep link and shows the confirmation toast.
- [ ] `/admin` is unreachable without the password, and reported content shows up there.
- [ ] Cron rollover has been manually verified at least once (step 7.4).
- [ ] Mobile viewport check on a couple of real screen sizes — layout matches the Figma spec at 402px width and doesn't break wider (desktop centers the same card).

Once all boxes are checked, share the domain.
