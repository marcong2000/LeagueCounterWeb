/**
 * DEV-ONLY synthetic fixture loader (NOT part of the real pipeline).
 * ============================================================================
 *
 * Inserts plausible synthetic `matches` + `participants` rows straight into
 * Postgres — bypassing Riot entirely — so the rest of the Phase 2 chain can be
 * verified end-to-end without network access or an API key:
 *
 *   db:migrate -> dev:fixtures -> aggregate -> (DATA_SOURCE=db) front-end
 *
 * This is the ONLY way to exercise the DB provider in environments that can't
 * reach the Riot API. It is never used in production. Champion ids come from the
 * bundled Data Dragon snapshot so names resolve in the UI.
 *
 * Usage:  DATABASE_URL=… npm run dev:fixtures [matchCount]
 */

import { Pool, type PoolClient } from 'pg';
import { getDatabaseUrl } from '../config';
import { CHAMPIONS_SNAPSHOT } from '../../src/lib/data/championsSnapshot';
import { LANES } from '../../src/lib/types';

const PATCH = '14.12';
const QUEUE_ID = 420;
const DEFAULT_MATCHES = 2500;
const CHAMPS_PER_LANE = 5;

// Deterministic PRNG so fixture runs are reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Assign a distinct pool of champions to each lane (no overlap). */
function buildLanePools(): Record<string, string[]> {
  const ids = CHAMPIONS_SNAPSHOT.map((c) => c.id);
  const pools: Record<string, string[]> = {};
  let cursor = 0;
  for (const lane of LANES) {
    pools[lane] = ids.slice(cursor, cursor + CHAMPS_PER_LANE);
    cursor += CHAMPS_PER_LANE;
  }
  return pools;
}

let fakePuuid = 0;
function nextPuuid(): string {
  return `FIXTURE-PUUID-${(fakePuuid++).toString().padStart(7, '0')}`;
}

async function insertMatch(
  client: PoolClient,
  rng: () => number,
  lanePools: Record<string, string[]>,
  index: number,
): Promise<void> {
  const matchId = `FIXTURE_${index.toString().padStart(7, '0')}`;
  const team100Wins = rng() < 0.5;

  await client.query(
    `INSERT INTO matches
       (match_id, platform, region, queue_id, patch, game_creation, game_duration)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (match_id) DO NOTHING`,
    [matchId, 'na1', 'americas', QUEUE_ID, PATCH, Date.now() - index * 1000, 1800],
  );

  const values: unknown[] = [];
  const tuples: string[] = [];
  let p = 0;
  for (const teamId of [100, 200]) {
    const win = teamId === 100 ? team100Wins : !team100Wins;
    for (const lane of LANES) {
      const pool = lanePools[lane];
      const championId = pool[Math.floor(rng() * pool.length)];
      const champ = CHAMPIONS_SNAPSHOT.find((c) => c.id === championId)!;
      const base = p * 7;
      tuples.push(
        `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7})`,
      );
      values.push(matchId, nextPuuid(), teamId, championId, 0, lane, win);
      p++;
    }
  }

  await client.query(
    `INSERT INTO participants
       (match_id, puuid, team_id, champion_id, champion_key, lane, win)
     VALUES ${tuples.join(',')}
     ON CONFLICT (match_id, puuid) DO NOTHING`,
    values,
  );
}

async function main() {
  const matchCount = Number(process.argv[2] ?? DEFAULT_MATCHES);
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const rng = mulberry32(0xc0ffee);
  const lanePools = buildLanePools();

  const client = await pool.connect();
  try {
    console.log(`Loading ${matchCount} synthetic matches (patch ${PATCH}) …`);
    await client.query('BEGIN');
    for (let i = 0; i < matchCount; i++) {
      await insertMatch(client, rng, lanePools, i);
    }
    await client.query('COMMIT');
    console.log('Fixture load complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fixture load failed:', err);
  process.exit(1);
});
