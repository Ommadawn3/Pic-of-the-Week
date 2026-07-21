# Deploying Pic of the Week — step by step

Written for someone who hasn't deployed a site before. Do these in order.
Every command goes in **Terminal** (press `Cmd+Space`, type "Terminal", hit Enter).

**Before you start:** open a **brand-new Terminal window**. Your Node install
lives in a folder that only new windows pick up. Check it works:

```
cd ~/POW
node -v
```

You should see something like `v26.5.0`. If you get "command not found", close
Terminal completely and open a fresh window.

**What this costs:** everything here is free except the domain (~$12–20/year).

---

## Stage 1 — Put the code on GitHub

GitHub stores your code. Vercel reads from it to deploy.

1. Go to https://github.com and make an account (skip if you have one).
2. Click the **+** in the top-right → **New repository**.
3. Fill in:
   - **Repository name**: `pic-of-the-week`
   - **Private** (recommended)
   - **Do NOT** check "Add a README" or any other file — the repo must start empty.
4. Click **Create repository**.
5. GitHub shows a page with commands. Ignore it and run these instead, replacing
   `YOUR-USERNAME` with your GitHub username:

```
cd ~/POW
git remote add origin https://github.com/YOUR-USERNAME/pic-of-the-week.git
git push -u origin main
```

6. It will ask you to sign in. A browser window opens — approve it.
7. Refresh the GitHub page. You should see your files.

> If it says `remote origin already exists`, run
> `git remote set-url origin https://github.com/YOUR-USERNAME/pic-of-the-week.git`
> and push again.

---

## Stage 2 — Deploy to Vercel

Vercel runs the website.

1. Go to https://vercel.com → **Sign Up** → **Continue with GitHub**.
2. Click **Add New…** → **Project**.
3. Find `pic-of-the-week` in the list → **Import**.
4. **Stop before clicking Deploy.** Expand **Environment Variables** first.

You need to add 5 variables. Get the first four by running this and copying the
values (do NOT share this output publicly — these are secrets):

```
cd ~/POW
cat .env.local
```

Add these, one at a time (Name on the left, Value on the right):

| Name | Where the value comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | from `.env.local` |
| `ADMIN_DASHBOARD_PASSWORD` | from `.env.local` (this unlocks `/admin`) |
| `CRON_SECRET` | make one up — a long random string, e.g. from `openssl rand -base64 24` |

> **Do not** add `SUPABASE_DB_URL` or `SUPABASE_ACCESS_TOKEN`. Those are only for
> running database scripts from your own machine. The website never uses them,
> so keep them off the internet.

5. Click **Deploy**. Wait ~2 minutes.
6. You'll get a URL like `pic-of-the-week-abc123.vercel.app`. Open it.

**The site will load but sign-in won't work yet** — that's expected. Stage 3 fixes it.

---

## Stage 3 — Make sign-in work (do not skip)

Magic-link emails fail silently if you skip this.

1. Go to https://supabase.com/dashboard/project/bfvktbjregwidbmopwtv/auth/url-configuration
2. Set **Site URL** to your Vercel URL, e.g. `https://pic-of-the-week-abc123.vercel.app`
3. Under **Redirect URLs**, click **Add URL** and add:
   - `https://pic-of-the-week-abc123.vercel.app/**`
   - `http://localhost:3000/**` (so local development keeps working)
4. **Save**.
5. Test it: open your Vercel URL, go to `/signin`, enter your real email, and
   click the link in the email. You should end up signed in.

> Supabase's built-in email is rate-limited and meant for testing. It's fine for
> now, but see Stage 6 before you share the site widely.

---

## Stage 4 — Buy a domain and connect it

1. In Vercel, open your project → **Settings** → **Domains**.
2. Type the domain you want. If it's available, Vercel offers to sell it to you —
   this is the easiest path because it configures everything automatically.
   - Name ideas: `picofthewk.com`, `potw.app`, `weeklypic.com`, `thepicoftheweek.com`
3. Pay. Wait a few minutes for the green checkmark.

**If you'd rather buy elsewhere** (Cloudflare sells at cost, Namecheap is popular):
buy there, then in Vercel **Settings → Domains → Add**, type your domain, and
Vercel shows you DNS records to copy into your registrar's DNS settings. It can
take a few minutes to a few hours to verify.

**Then repeat Stage 3 with the real domain** — change Site URL to
`https://yourdomain.com` and add `https://yourdomain.com/**` to Redirect URLs.
Sign-in breaks if you forget this.

---

## Stage 5 — Turn on the weekly rollover

This is what flips the contest over every Wednesday.

Already configured in `vercel.json`. Just confirm it registered:

1. Vercel project → **Settings** → **Cron Jobs**.
2. You should see `/api/cron/rollover-week` scheduled `0 4 * * 3` (Wednesdays).
3. If it isn't there, redeploy: **Deployments** → latest → **⋯** → **Redeploy**.

The schedule is 4:00 UTC = midnight Eastern in winter, 1am Eastern in summer.
The code itself always computes the correct Wednesday boundary in Eastern time,
so a daylight-saving shift can delay a rollover by an hour but never breaks it.

---

## Stage 6 — Real email (before you share the site)

Supabase's default email sender will rate-limit you once real people sign up.

1. Make a free account at https://resend.com (or Postmark / SendGrid).
2. Follow their steps to verify your domain.
3. They'll give you SMTP settings (host, port, username, password).
4. In Supabase: **Project Settings → Authentication → SMTP Settings** → enable
   **Custom SMTP** → paste them in → Save.

---

## Stage 7 — Clear the demo data

Your database currently holds fake photos (Alex, Sam, Jordan, Casey, Riley).
Wipe them before real users arrive:

```
cd ~/POW
node -e 'import("./scripts/mgmt.mjs").then(async ({runSql}) => {
  await runSql("truncate reports, view_sessions, caption_votes, captions, photos, contest_weeks restart identity cascade");
  await runSql("select * from rollover_contest_week()");
  console.log("cleared demo data and started a fresh contest week");
})'
```

The seed accounts (`*@seed.picoftheweek.test`) can be deleted in Supabase under
**Authentication → Users** if you want them gone too.

---

## Final checklist

Test on a **real phone**, not a desktop browser — the camera is the risky part.

- [ ] Sign-in email arrives and logs you in
- [ ] **Camera works on iPhone Safari** (permission prompt appears, capture works)
- [ ] **Camera works on Android Chrome**
- [ ] Submitting a photo works, and it shows on the home screen
- [ ] Captions: write one, vote on someone else's
- [ ] Share button copies a link that opens the right photo
- [ ] `yourdomain.com/admin` asks for the password and lets you in
- [ ] Switching weeks works and past weeks are read-only

---

## Things to know

**Making changes later.** Edit code, then:

```
cd ~/POW
git add -A
git commit -m "describe what you changed"
git push
```

Vercel redeploys automatically in ~2 minutes.

**Turning limits back on.** Right now anyone can post unlimited photos and
captions (deliberate, for testing). To enforce one each, add these in Vercel
**Settings → Environment Variables**, then redeploy:

```
MAX_PHOTOS_PER_WEEK=1
MAX_CAPTIONS_PER_PHOTO=1
```

**Your admin password** is in `.env.local`. To change it, update it there *and*
in Vercel's environment variables, then redeploy.

**Keep `.env.local` private.** It's already excluded from GitHub. Never paste its
contents into a public place.
