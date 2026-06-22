# Counterforge

A fast, responsive **League of Legends champion counter-pick statistics** site.
Browse every champion's win rate, pick rate and lane split, then open a champion
to see their best counters and worst matchups by lane — with a computed
**counter score** for each matchup.

> **Original design.** Counterforge has its own visual identity (the "abyss /
> ember / frost" dark palette) and is **not** a clone of any existing stats site.
> Functional similarity to matchup sites is intentional; visual copying is not.

The project is built in two phases:

- **Phase 1 (this site, runs now):** a complete, polished front-end. Champion
  names and images come live from Riot's free **Data Dragon** CDN (no API key),
  and all statistics are clearly-labelled **synthetic sample data**. This phase
  is fully deployable on its own and doubles as the working prototype Riot
  requires before issuing a production API key.
- **Phase 2 (scaffolded, runs later):** a Node + PostgreSQL pipeline that
  ingests real matches from the Riot Match API and computes the matchup
  statistics. The code and schema exist now but stay inactive until the owner
  has a production key and hosting. See [`backend/README.md`](backend/README.md).

## Tech stack

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS** for styling
- **Data Dragon** for static champion data/images (free, no key)
- **Node + TypeScript + PostgreSQL** for the Phase 2 pipeline (scaffold)

## Run Phase 1 locally

No API key, database, or environment variables are required.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You should see all champions with real images and
synthetic stats. Sorting, lane filtering and name search all work, and each
champion page renders best/worst matchups by lane.

> **Offline / restricted networks:** if the Data Dragon CDN is unreachable, the
> app automatically falls back to a bundled champion snapshot
> (`src/lib/data/championsSnapshot.ts`) so it still renders. When the CDN is
> reachable, names/images use the current live patch.

Other scripts:

```bash
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

## How the data flows (the §5 abstraction)

The front-end **only** imports from a single data-access module,
[`src/lib/data/index.ts`](src/lib/data/index.ts):

```ts
getAllChampions(): Promise<ChampionSummary[]>
getChampion(slug):  Promise<ChampionDetail | null>
getMatchups(slug, lane?): Promise<Matchup[]>
isSampleData(): boolean
```

- In **Phase 1** these assemble data from Data Dragon (names/images) plus a
  deterministic sample generator (`src/lib/data/sampleData.ts`).
- In **Phase 2** the identical signatures read from Postgres
  (`src/lib/data/db.ts`). Because the types are shared
  (`src/lib/types.ts`), swapping the source is a drop-in change with **no
  front-end edits**.

## The counter score

The "counter score" is our own computed metric, defined once in
[`src/lib/counterScore.ts`](src/lib/counterScore.ts) and used by **both** phases:

```
counterScore = clamp((winRate - 0.5) × 200, -50, +50)
```

50% win rate → `0` (neutral); positive means the champion counters the opponent.
Matchups under a minimum sample size (`MIN_GAMES`) are flagged low-confidence and
hidden by default. Because Phase 1's sample win rates feed the same formula, the
displayed numbers are internally consistent with what Phase 2 will produce.

## Pages

| Route | Description |
| --- | --- |
| `/` | Champion index — sortable (win/pick rate), filterable by lane, searchable by name. |
| `/champion/[slug]` | Champion detail — header, lane split, best/worst matchups by lane, tips. |
| `/about` | What the site does, the methodology, and the Riot attribution. |
| `/terms`, `/privacy` | Placeholder legal pages (owner replaces before launch). |
| `404` | Friendly not-found page. |

## Activating Phase 2 (real data) later

Full instructions are in [`backend/README.md`](backend/README.md). In short:

1. Get a Riot **production** key (submit this site as the working product).
2. Provision PostgreSQL; copy `.env.example` → `.env` and fill it in.
3. `npm run db:migrate`, seed players, `npm run ingest`, then `npm run aggregate`.
4. In `src/lib/data/index.ts`, re-export from `./db` and make
   `isSampleData()` return `false`. The sample badges disappear and the site
   serves real computed stats — no other front-end changes needed.

## Compliance

- The required "not endorsed by Riot Games" disclaimer appears in the footer and
  on `/about`.
- Placeholder `/terms` and `/privacy` pages are included for the owner to
  replace with real copy before production submission.
- **No API key is ever embedded** in the repo or client code. All key-bearing
  Riot calls happen server-side in Phase 2, with the key supplied via the
  `RIOT_API_KEY` environment variable.

Champion data and images © Riot Games, via Data Dragon. Counterforge isn't
endorsed by Riot Games.
