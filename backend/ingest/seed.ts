/**
 * Seed bootstrapper (Phase 2 scaffold).
 * ============================================================================
 *
 * Populates `ingest_seeds` so the ingestion worker has players to walk. Two
 * sources, used together:
 *
 *   1. APEX LADDERS (default): pulls Challenger + Grandmaster + Master entries
 *      for ranked solo via league-v4, resolves each to a PUUID, and inserts
 *      them. This yields a high-quality ranked sample with no manual input.
 *      The worker then SNOWBALLS to opponents seen in their matches.
 *
 *   2. MANUAL Riot IDs (optional): any CLI args of the form `gameName#tag` are
 *      resolved via account-v1 and added too. Handy for targeting specific
 *      players/regions.
 *
 * Usage:
 *   npm run seed                      # apex ladders only
 *   npm run seed -- Faker#KR1 Caps#EUW   # apex ladders + these accounts
 *
 * Requires RIOT_API_KEY, DATABASE_URL, RIOT_REGION, RIOT_PLATFORM (see config).
 */

import { Pool } from 'pg';
import { getConfig } from '../config';
import { RiotClient, type ApexTier, type LeagueEntry } from './riotClient';

const APEX_TIERS: ApexTier[] = ['challenger', 'grandmaster', 'master'];

/** Resolve league entries to PUUIDs, using summoner-v4 only when needed. */
async function entriesToPuuids(
  riot: RiotClient,
  entries: LeagueEntry[],
): Promise<string[]> {
  const puuids: string[] = [];
  for (const e of entries) {
    if (e.puuid) {
      puuids.push(e.puuid);
    } else if (e.summonerId) {
      try {
        puuids.push(await riot.getPuuidBySummonerId(e.summonerId));
      } catch (err) {
        console.warn('  skip entry (puuid resolve failed):', (err as Error).message);
      }
    }
  }
  return puuids;
}

async function insertSeeds(
  pool: Pool,
  puuids: Iterable<string>,
  region: string,
): Promise<number> {
  let added = 0;
  for (const puuid of puuids) {
    const { rowCount } = await pool.query(
      'INSERT INTO ingest_seeds (puuid, region) VALUES ($1, $2) ON CONFLICT (puuid) DO NOTHING',
      [puuid, region],
    );
    added += rowCount ?? 0;
  }
  return added;
}

/** Parse `gameName#tag` CLI args into {gameName, tagLine} pairs. */
function parseRiotIdArgs(args: string[]): { gameName: string; tagLine: string }[] {
  return args
    .filter((a) => a.includes('#'))
    .map((a) => {
      const [gameName, tagLine] = a.split('#');
      return { gameName, tagLine };
    });
}

async function main() {
  const config = getConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const riot = new RiotClient(config.riotApiKey, config.region, config.platform);

  try {
    const collected = new Set<string>();

    // 1. Apex ladders.
    for (const tier of APEX_TIERS) {
      const entries = await riot.getApexLeague(tier);
      const puuids = await entriesToPuuids(riot, entries);
      puuids.forEach((p) => collected.add(p));
      console.log(`${tier}: ${entries.length} entries -> ${puuids.length} puuids`);
    }

    // 2. Manual Riot IDs (optional CLI args).
    const manual = parseRiotIdArgs(process.argv.slice(2));
    for (const { gameName, tagLine } of manual) {
      try {
        collected.add(await riot.getPuuidByRiotId(gameName, tagLine));
        console.log(`manual: resolved ${gameName}#${tagLine}`);
      } catch (err) {
        console.warn(`manual: failed ${gameName}#${tagLine}:`, (err as Error).message);
      }
    }

    const added = await insertSeeds(pool, collected, config.region);
    console.log(
      `Seeding complete. ${collected.size} unique puuids collected, ${added} new seeds inserted.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
