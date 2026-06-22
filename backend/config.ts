/**
 * Phase 2 configuration — all secrets come from environment variables.
 * NEVER hardcode the Riot API key or DB credentials. See .env.example.
 */

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
  /** Regional routing for match-v5: americas | europe | asia | sea. */
  region: string;
  /** Ranked queue id to ingest (420 = Solo/Duo). */
  queueId: number;
}

/** Full config for the ingestion worker (requires the Riot key). */
export function getConfig(): IngestConfig {
  return {
    riotApiKey: required('RIOT_API_KEY'),
    databaseUrl: required('DATABASE_URL'),
    region: process.env.RIOT_REGION ?? 'americas',
    queueId: Number(process.env.RIOT_QUEUE_ID ?? '420'),
  };
}
