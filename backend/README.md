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
| `ingest/riotClient.ts` | `summoner`/`match-v5` client with 429 `Retry-After` backoff. |
| `ingest/worker.ts` | Walks match history from seed players, stores raw rows, resumable. |
| `aggregate/job.ts` | Recomputes `matchup_stats` / `champion_stats` per patch using the **same** counter-score formula as the front-end (`src/lib/counterScore.ts`). |

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

1. **Obtain a production key.** Submit this Phase 1 site as your working product
   at <https://developer.riotgames.com/>. (Dev keys expire every 24h and are not
   valid for a public site.)
2. **Provision Postgres** and set env vars (copy `.env.example` → `.env`):
   ```bash
   export DATABASE_URL=postgres://…
   export RIOT_API_KEY=RGAPI-…
   export RIOT_REGION=americas
   ```
3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```
4. **Seed players.** Insert a few known PUUIDs to bootstrap snowball sampling:
   ```sql
   INSERT INTO ingest_seeds (puuid, region) VALUES ('<puuid>', 'americas');
   ```
   (Resolve PUUIDs with `RiotClient.getPuuidByRiotId('Name', 'TAG')`.)
5. **Ingest matches** (run on a schedule / process manager; re-run daily after
   rotating the key):
   ```bash
   npm run ingest
   ```
6. **Aggregate** after each ingestion batch / once per patch:
   ```bash
   npm run aggregate
   ```
7. **Flip the data layer.** In `src/lib/data/index.ts`, re-export from
   `./db` instead of the sample assembler and set `isSampleData()` to return
   `false`. The front-end needs no other changes — the "Sample data" badges
   disappear automatically and the site now serves real computed stats.
