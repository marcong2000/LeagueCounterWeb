# Deploying Counterforge to Vercel

This guide deploys the **Phase 1 front-end** (synthetic sample data) to Vercel to
get a public URL — the working product you submit when applying for a Riot
**production** API key. No API key or database is required for this deployment.

> Why Vercel: it's built by the makers of Next.js, auto-detects this app, and has
> a free tier. Any Next.js-capable host works; the steps below are Vercel-specific.

## What gets deployed

- The full site on **sample data** (`DATA_SOURCE` unset → sample provider).
- Champion names/images load live from Riot's Data Dragon CDN at build/runtime
  (reachable from Vercel), so you get real art and the current patch.
- No secrets are needed. `pg` is bundled but never connects in sample mode.

## One-time setup (Vercel dashboard — easiest)

1. Go to <https://vercel.com> and sign in with your GitHub account.
2. **Add New… → Project**, then **Import** the `marcong2000/LeagueCounterWeb`
   repository.
3. Vercel auto-detects **Next.js** — leave the defaults:
   - Framework Preset: **Next.js**
   - Build Command: `next build` (default)
   - Output: handled automatically
   - Install Command: `npm install` (default)
4. **Production Branch:** by default Vercel deploys your repo's default branch
   (usually `main`). Either:
   - merge `claude/tender-cannon-fjy5nd` into `main` first, **or**
   - after import, go to **Settings → Git → Production Branch** and set it to
     `claude/tender-cannon-fjy5nd`.
5. Leave **Environment Variables empty** for this first (sample-data) deploy.
6. Click **Deploy**. In ~1–2 minutes you'll get a public URL like
   `https://leaguecounterweb.vercel.app`. That URL is what you put on the Riot
   production-key application.

Every push to the production branch redeploys automatically; pushes to other
branches get preview URLs.

## CLI alternative

```bash
npm i -g vercel
vercel            # first run: links the project, creates a preview deploy
vercel --prod     # promote to the production URL
```

## Verify the deployment

- Home page lists all champions with real icons and a **"Sample data"** badge.
- Sorting, lane filter, and search work; a champion page shows best/worst
  matchups; `/about`, `/terms`, `/privacy` render; an unknown champion 404s.

## Before you submit the Riot application

- Replace the placeholder **/terms** and **/privacy** copy with real text.
- Confirm the footer's "not endorsed by Riot Games" disclaimer is present (it is).

## Later: switching the deployed site to real data (after you get a prod key)

You do **not** redeploy code — just add environment variables in
**Vercel → Settings → Environment Variables** and redeploy:

| Variable | Value |
| --- | --- |
| `DATA_SOURCE` | `db` |
| `DATABASE_URL` | connection string of your **managed** Postgres (Neon/Supabase/etc.) |

Ingestion + aggregation run separately (a scheduled job with the prod key, see
`backend/README.md`) and write to that same database. The deployed site reads
from it; if it's empty, the site safely falls back to sample data. Keep
`RIOT_API_KEY` **only** on the ingestion host — the front-end never needs it.
