# Phase 2 backend — data ingestion & aggregation

This directory is **scaffolded but inactive**. It does not run as part of the
Phase 1 front-end, and it requires a Riot **production** API key plus a
PostgreSQL database. Nothing here is wired into the website until you perform
the "Go live" steps below.

## Why a custom pipeline?

The Riot Match API (`match-v5`) returns only **raw per-match data** — there is
no endpoint for "Champion X vs Champion Y win rate". To show matchup statistics
we must:

1. **Ingest** a large sample of individual ranked matches, and
2. **Aggregate** them into per-matchup win rates and counter scores ourselves.

Postgres is used for storage because the data is highly relational (matches →
participants → derived aggregates) and the aggregation is a natural SQL
group-by/self-join. It is swappable: the only consumer is the data-access layer
(`src/lib/data/db.ts`), so any store that can satisfy those queries works.

## Components

| File | Purpose |
| --- | --- |
| `config.ts` | Reads all secrets from env vars (`RIOT_API_KEY`, `DATABASE_URL`, …). |
| `db/schema.sql` | Tables: `matches`, `participants`, `ingest_seeds`, `matchup_stats`, `champion_stats`. |
| `db/migrate.ts` | Applies `schema.sql` (idempotent). |
| `ingest/rateLimiter.ts` | Multi-window token bucket honouring Riot's app/method/burst limits. |
| `ingest/riotClient.ts` | `account`/`summoner`/`league`/`match-v5` client with 429 `Retry-After` backoff. |
| `ingest/seed.ts` | Bootstraps `ingest_seeds` from apex ladders (+ optional Riot IDs). |
| `ingest/worker.ts` | Walks match history from seeds, stores raw rows, resumable, snowballs new seeds. |
| `aggregate/job.ts` | Recomputes `matchup_stats` / `champion_stats` per patch using the **same** counter-score formula as the front-end (`src/lib/counterScore.ts`). |
| `dev/loadFixtures.ts` | **Dev-only** synthetic match loader for testing the DB chain without Riot. |
| `ingest/riotClient.test.ts` | Unit tests (mocked `fetch`) for routing, 429/5xx backoff, helpers. |

## Routing: region vs platform

Riot splits endpoints across two routing systems — both come from env vars:

- `RIOT_REGION` (americas/europe/asia/sea) → **match-v5** and **account-v1**.
- `RIOT_PLATFORM` (na1/euw1/kr/…) → **league-v4** and **summoner-v4**.

`RIOT_PLATFORM` must sit inside `RIOT_REGION` (e.g. `na1`/`br1` → `americas`,
`euw1` → `europe`, `kr` → `asia`).

## Rate limiting & resilience

- `RiotClient` routes every request through `RateLimiter`, which enforces
  multiple windows simultaneously (burst + sustained). Tune `DEFAULT_PROD_WINDOWS`
  to match the exact limits shown in your approved app on the Riot portal.
- On HTTP 429 the client pauses for the server-provided `Retry-After` and
  retries; on 5xx it backs off exponentially.
- The worker is **resumable**: each seed's cursor (`ingest_seeds.last_match_ts`)
  advances per run, so you can stop/restart and rotate keys daily without
  re-pulling everything. Inserts use `ON CONFLICT DO NOTHING`.

## Go live

1. **Obtain a key.** A development key works for local testing (expires every
   24h); a **production** key is required for a public site — submit this Phase 1
   site as your working product at <https://developer.riotgames.com/>.
2. **Provision Postgres** and configure env (copy `.env.example` → `.env`):
   ```
   RIOT_API_KEY=RGAPI-…          # paste your key here (never committed)
   DATABASE_URL=postgres://…
   RIOT_REGION=americas          # match-v5 / account-v1
   RIOT_PLATFORM=na1             # league-v4 / summoner-v4
   ```
   All backend scripts load this project-root `.env` automatically (via
   `dotenv`, wired up in `backend/config.ts`) — no shell `export` needed.
3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```
4. **Seed players** from the apex ladders (Challenger/GM/Master). Optionally add
   specific accounts as `gameName#tag` args:
   ```bash
   npm run seed                    # apex ladders only
   npm run seed -- Faker#KR1       # apex ladders + this account
   ```
5. **Ingest matches** (schedule it; re-run daily after rotating the key). Each
   run also snowballs newly-seen players into `ingest_seeds`:
   ```bash
   npm run ingest
   ```
   On a **development key** the worker self-throttles to ~100 requests / 2 min
   (`RIOT_RATE_PROFILE=dev`, the default), so it is deliberately slow but prints
   per-seed progress as it goes. Defaults are small (`INGEST_MAX_SEEDS=10`,
   `INGEST_MATCHES_PER_SEED=20`) so a first run finishes in a few minutes. Once
   you have a **production key**, set `RIOT_RATE_PROFILE=prod` and raise those
   numbers to ingest at full speed.
6. **Aggregate** after each ingestion batch / once per patch:
   ```bash
   npm run aggregate
   ```
7. **Flip the data layer** — no code edit needed. Set `DATA_SOURCE=db` in the
   front-end's environment and (re)deploy:
   ```bash
   DATA_SOURCE=db npm run build && DATA_SOURCE=db npm run start
   ```
   The "Sample data" badges disappear automatically and the site serves real
   computed stats. If the DB has no aggregated rows yet, the site safely falls
   back to sample data and logs a warning.
8. **(Optional) Refresh caches on demand.** Set `REVALIDATE_TOKEN` and have the
   aggregation job POST to `/api/revalidate?token=$REVALIDATE_TOKEN` after each
   run to refresh cached pages immediately.

## Verifying the DB chain without Riot (no key / restricted network)

You can exercise everything except the live Riot calls using synthetic fixtures:

```bash
export DATABASE_URL=postgres://…
npm run db:migrate
npm run dev:fixtures        # insert ~2500 synthetic matches straight into PG
npm run aggregate           # compute champion_stats + matchup_stats
DATA_SOURCE=db npm run dev  # front-end now serves the computed numbers
```

The Riot HTTP layer itself is covered by `npm run test` (mocked `fetch`).
