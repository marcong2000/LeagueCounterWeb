/**
 * Phase 2 configuration — all secrets come from environment variables.
 * NEVER hardcode the Riot API key or DB credentials. See .env.example.
 *
 * `dotenv/config` (imported first) loads the project-root `.env` so every
 * backend script run via tsx (migrate/seed/ingest/aggregate/dev:fixtures) reads
 * it automatically — tsx, unlike the Next.js commands, does not load `.env` on
 * its own.
 */
import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env and fill it in. (Phase 2 only.)`,
    );
  }
  return value;
}

/** Postgres connection string (needed by migrate, ingest and aggregate). */
export function getDatabaseUrl(): string {
  return required('DATABASE_URL');
}

export interface IngestConfig {
  /** Riot production API key. Supplied ONLY via RIOT_API_KEY. */
  riotApiKey: string;
  /** Postgres connection string. */
  databaseUrl: string;
  /**
   * REGIONAL routing value for match-v5 + account-v1:
   * americas | europe | asia | sea.
   */
  region: string;
  /**
   * PLATFORM routing value for league-v4 + summoner-v4:
   * na1 | euw1 | eun1 | kr | br1 | jp1 | … (must be within `region`).
   */
  platform: string;
  /** Ranked queue id to ingest (420 = Solo/Duo). */
  queueId: number;
  /**
   * Rate-limit tier. 'dev' (default) stays under personal/development key
   * limits (100 req / 2 min); 'prod' uses the higher production windows.
   */
  rateProfile: 'dev' | 'prod';
  /** Max seed players to process per ingestion run. */
  maxSeeds: number;
  /** Max match ids to pull per seed per run. */
  matchesPerSeed: number;
}

/** Full config for the ingestion worker / seeder (requires the Riot key). */
export function getConfig(): IngestConfig {
  const rateProfile = process.env.RIOT_RATE_PROFILE === 'prod' ? 'prod' : 'dev';
  // Small, fast defaults on a dev key so a first run finishes in minutes.
  const devDefaults = rateProfile === 'prod';
  return {
    riotApiKey: required('RIOT_API_KEY'),
    databaseUrl: required('DATABASE_URL'),
    region: process.env.RIOT_REGION ?? 'americas',
    platform: process.env.RIOT_PLATFORM ?? 'na1',
    queueId: Number(process.env.RIOT_QUEUE_ID ?? '420'),
    rateProfile,
    maxSeeds: Number(process.env.INGEST_MAX_SEEDS ?? (devDefaults ? '50' : '10')),
    matchesPerSeed: Number(
      process.env.INGEST_MATCHES_PER_SEED ?? (devDefaults ? '100' : '20'),
    ),
  };
}
