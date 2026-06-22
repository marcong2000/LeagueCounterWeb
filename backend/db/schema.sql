-- ============================================================================
-- Counterforge — Phase 2 PostgreSQL schema
-- ============================================================================
-- Stores RAW match/participant data ingested from the Riot Match-V5 API, plus a
-- derived `matchup_stats` aggregate that the front-end reads via the data-access
-- layer (src/lib/data/index.ts) once Phase 2 is activated.
--
-- The Riot API never returns aggregate matchup win rates — only raw matches.
-- `matchup_stats` is therefore COMPUTED by backend/aggregate/job.ts using the
-- same counter-score formula as src/lib/counterScore.ts.
--
-- Apply with:  psql "$DATABASE_URL" -f backend/db/schema.sql
-- (or run `npm run db:migrate`).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Raw matches: one row per Riot match id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  match_id        TEXT PRIMARY KEY,            -- e.g. "EUW1_6789012345"
  platform        TEXT NOT NULL,               -- e.g. "euw1"
  region          TEXT NOT NULL,               -- routing value, e.g. "europe"
  queue_id        INTEGER NOT NULL,            -- 420 = ranked solo/duo, etc.
  patch           TEXT NOT NULL,               -- gameVersion major.minor, e.g. "14.12"
  game_creation   BIGINT NOT NULL,             -- epoch ms
  game_duration   INTEGER NOT NULL,            -- seconds
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_patch ON matches (patch);
CREATE INDEX IF NOT EXISTS idx_matches_queue ON matches (queue_id);

-- ---------------------------------------------------------------------------
-- Participants: 10 rows per match (one per player).
-- `lane` is the normalised role we assign (top/jungle/mid/bot/support).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participants (
  match_id        TEXT NOT NULL REFERENCES matches (match_id) ON DELETE CASCADE,
  puuid           TEXT NOT NULL,
  team_id         INTEGER NOT NULL,            -- 100 or 200
  champion_id     TEXT NOT NULL,               -- Data Dragon id, e.g. "Garen"
  champion_key    INTEGER NOT NULL,            -- Riot numeric champion id
  lane            TEXT NOT NULL,               -- normalised: top|jungle|mid|bot|support
  win             BOOLEAN NOT NULL,
  PRIMARY KEY (match_id, puuid)
);

CREATE INDEX IF NOT EXISTS idx_participants_champ_lane ON participants (champion_id, lane);
CREATE INDEX IF NOT EXISTS idx_participants_match ON participants (match_id);

-- ---------------------------------------------------------------------------
-- Seed players + ingestion cursors: lets the worker resume and walk match
-- history incrementally across runs / daily key rotations.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingest_seeds (
  puuid           TEXT PRIMARY KEY,
  region          TEXT NOT NULL,
  last_match_ts   BIGINT NOT NULL DEFAULT 0,   -- newest match epoch ms already pulled
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Derived aggregate: one row per (champion, opponent, lane, patch).
-- Recomputed by the aggregation job; this is what the site reads in Phase 2.
-- counter_score is produced by the SAME formula as src/lib/counterScore.ts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matchup_stats (
  champion_id     TEXT NOT NULL,
  opponent_id     TEXT NOT NULL,
  lane            TEXT NOT NULL,
  patch           TEXT NOT NULL,
  games           INTEGER NOT NULL,
  wins            INTEGER NOT NULL,
  win_rate        DOUBLE PRECISION NOT NULL,
  counter_score   DOUBLE PRECISION NOT NULL,
  low_confidence  BOOLEAN NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (champion_id, opponent_id, lane, patch)
);

CREATE INDEX IF NOT EXISTS idx_matchup_champ ON matchup_stats (champion_id, patch);

-- ---------------------------------------------------------------------------
-- Per-champion aggregate (overall win/pick rate + lane split) per patch.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS champion_stats (
  champion_id     TEXT NOT NULL,
  patch           TEXT NOT NULL,
  games           INTEGER NOT NULL,
  wins            INTEGER NOT NULL,
  win_rate        DOUBLE PRECISION NOT NULL,
  pick_rate       DOUBLE PRECISION NOT NULL,
  lane_top        DOUBLE PRECISION NOT NULL DEFAULT 0,
  lane_jungle     DOUBLE PRECISION NOT NULL DEFAULT 0,
  lane_mid        DOUBLE PRECISION NOT NULL DEFAULT 0,
  lane_bot        DOUBLE PRECISION NOT NULL DEFAULT 0,
  lane_support    DOUBLE PRECISION NOT NULL DEFAULT 0,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (champion_id, patch)
);
