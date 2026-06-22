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
import {
  RiotClient,
  normaliseLane,
  patchFromGameVersion,
  type MatchDetail,
} from './riotClient';

/** Max match ids to pull per seed per run (tune for your rate budget). */
const MATCHES_PER_SEED = 100;

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

async function loadSeeds(pool: Pool): Promise<{ puuid: string; lastTs: number }[]> {
  const { rows } = await pool.query<{ puuid: string; last_match_ts: string }>(
    'SELECT puuid, last_match_ts FROM ingest_seeds ORDER BY updated_at ASC LIMIT 50',
  );
  return rows.map((r) => ({ puuid: r.puuid, lastTs: Number(r.last_match_ts) }));
}

async function main() {
  const config = getConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const riot = new RiotClient(config.riotApiKey, config.region);

  try {
    const seeds = await loadSeeds(pool);
    if (seeds.length === 0) {
      console.warn(
        'No seeds in ingest_seeds. Bootstrap with known Riot IDs, e.g.:\n' +
          '  INSERT INTO ingest_seeds (puuid, region) VALUES (…);',
      );
      return;
    }

    let stored = 0;
    for (const seed of seeds) {
      const ids = await riot.getMatchIds(seed.puuid, {
        queue: config.queueId,
        count: MATCHES_PER_SEED,
        startTime: seed.lastTs > 0 ? Math.floor(seed.lastTs / 1000) : undefined,
      });

      let newestTs = seed.lastTs;
      const client = await pool.connect();
      try {
        for (const id of ids) {
          if (await matchExists(client, id)) continue;
          const match = await riot.getMatch(id);
          await storeMatch(client, match, config.region);
          newestTs = Math.max(newestTs, match.gameCreation);
          stored++;
        }
        await client.query(
          'UPDATE ingest_seeds SET last_match_ts = $1, updated_at = now() WHERE puuid = $2',
          [newestTs, seed.puuid],
        );
      } finally {
        client.release();
      }
    }

    console.log(`Ingestion run complete. Stored ${stored} new matches.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
