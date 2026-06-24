/**
 * Ingestion worker (Phase 2 scaffold — DO NOT RUN until you have a Riot
 * PRODUCTION key and a provisioned database).
 * ============================================================================
 *
 * Walks match history from seed players, stores raw matches + participants, and
 * advances each seed's cursor so runs are resumable across daily key rotations.
 *
 * Pipeline:
 *   1. Load seed PUUIDs from `ingest_seeds` (or bootstrap from RIOT IDs).
 *   2. For each seed, page match-v5 ids newer than its cursor.
 *   3. Fetch each match's detail (skipping ids already stored).
 *   4. Insert match + 10 participant rows in a transaction.
 *   5. Newly-seen PUUIDs can be enqueued as future seeds (snowball sampling).
 *
 * Rate limits and 429 backoff are handled inside RiotClient. Run under a
 * process manager and re-invoke daily after rotating the key.
 *
 * Usage:  RIOT_API_KEY=… DATABASE_URL=… npm run ingest
 */

import { Pool, type PoolClient } from 'pg';
import { getConfig } from '../config';
import { RateLimiter, windowsForProfile } from './rateLimiter';
import {
  RiotClient,
  normaliseLane,
  patchFromGameVersion,
  type MatchDetail,
} from './riotClient';

/** Max NEW snowball seeds to enqueue per run (widens sampling over time). */
const SNOWBALL_CAP = 200;

async function matchExists(client: PoolClient, matchId: string): Promise<boolean> {
  const { rowCount } = await client.query(
    'SELECT 1 FROM matches WHERE match_id = $1',
    [matchId],
  );
  return (rowCount ?? 0) > 0;
}

async function storeMatch(client: PoolClient, m: MatchDetail, region: string): Promise<void> {
  const patch = patchFromGameVersion(m.gameVersion);
  await client.query('BEGIN');
  try {
    await client.query(
      `INSERT INTO matches
         (match_id, platform, region, queue_id, patch, game_creation, game_duration)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (match_id) DO NOTHING`,
      [
        m.matchId,
        m.platformId.toLowerCase(),
        region,
        m.queueId,
        patch,
        m.gameCreation,
        m.gameDuration,
      ],
    );

    for (const p of m.participants) {
      const lane = normaliseLane(p.teamPosition);
      if (!lane) continue; // skip unknown roles / remakes
      await client.query(
        `INSERT INTO participants
           (match_id, puuid, team_id, champion_id, champion_key, lane, win)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (match_id, puuid) DO NOTHING`,
        [m.matchId, p.puuid, p.teamId, p.championName, p.championId, lane, p.win],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function loadSeeds(
  pool: Pool,
  limit: number,
): Promise<{ puuid: string; lastTs: number }[]> {
  const { rows } = await pool.query<{ puuid: string; last_match_ts: string }>(
    'SELECT puuid, last_match_ts FROM ingest_seeds ORDER BY updated_at ASC LIMIT $1',
    [limit],
  );
  return rows.map((r) => ({ puuid: r.puuid, lastTs: Number(r.last_match_ts) }));
}

/**
 * Snowball sampling: enqueue newly-seen PUUIDs as future seeds so coverage
 * widens automatically over successive runs. Capped per run; existing seeds are
 * ignored via ON CONFLICT.
 */
async function enqueueSnowballSeeds(
  pool: Pool,
  puuids: Set<string>,
  region: string,
): Promise<number> {
  const candidates = [...puuids].slice(0, SNOWBALL_CAP);
  let added = 0;
  for (const puuid of candidates) {
    const { rowCount } = await pool.query(
      'INSERT INTO ingest_seeds (puuid, region) VALUES ($1, $2) ON CONFLICT (puuid) DO NOTHING',
      [puuid, region],
    );
    added += rowCount ?? 0;
  }
  return added;
}

async function main() {
  const config = getConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const limiter = new RateLimiter(windowsForProfile(config.rateProfile));
  const riot = new RiotClient(
    config.riotApiKey,
    config.region,
    config.platform,
    limiter,
  );

  try {
    const seeds = await loadSeeds(pool, config.maxSeeds);
    if (seeds.length === 0) {
      console.warn(
        'No seeds in ingest_seeds. Bootstrap them first with:  npm run seed',
      );
      return;
    }

    const budget = seeds.length * config.matchesPerSeed;
    console.log(
      `Ingesting from ${seeds.length} seed(s), up to ${config.matchesPerSeed} ` +
        `matches each (~${budget} matches max).`,
    );
    if (config.rateProfile === 'dev') {
      console.log(
        'Rate profile: dev (~100 requests / 2 min). This is intentionally slow ' +
          'so a development key is not throttled — progress prints below.',
      );
    }

    let stored = 0;
    const seenPuuids = new Set<string>();
    for (let s = 0; s < seeds.length; s++) {
      const seed = seeds[s];
      const ids = await riot.getMatchIds(seed.puuid, {
        queue: config.queueId,
        count: config.matchesPerSeed,
        startTime: seed.lastTs > 0 ? Math.floor(seed.lastTs / 1000) : undefined,
      });
      console.log(
        `[seed ${s + 1}/${seeds.length}] ${seed.puuid.slice(0, 8)}… : ` +
          `${ids.length} match id(s) returned`,
      );

      let newestTs = seed.lastTs;
      let storedThisSeed = 0;
      const client = await pool.connect();
      try {
        for (const id of ids) {
          if (await matchExists(client, id)) continue;
          const match = await riot.getMatch(id);
          await storeMatch(client, match, config.region);
          for (const p of match.participants) seenPuuids.add(p.puuid);
          newestTs = Math.max(newestTs, match.gameCreation);
          stored++;
          storedThisSeed++;
          if (storedThisSeed % 10 === 0) {
            console.log(`    …stored ${storedThisSeed} new (total ${stored})`);
          }
        }
        await client.query(
          'UPDATE ingest_seeds SET last_match_ts = $1, updated_at = now() WHERE puuid = $2',
          [newestTs, seed.puuid],
        );
      } finally {
        client.release();
      }
      console.log(`    seed done: +${storedThisSeed} new matches`);
    }

    const added = await enqueueSnowballSeeds(pool, seenPuuids, config.region);
    console.log(
      `Ingestion run complete. Stored ${stored} new matches; ` +
        `enqueued ${added} new snowball seeds.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
