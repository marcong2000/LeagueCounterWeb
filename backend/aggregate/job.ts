/**
 * Aggregation job (Phase 2 scaffold).
 * ============================================================================
 *
 * Recomputes the derived `matchup_stats` and `champion_stats` tables from the
 * raw `participants` / `matches` data, per patch. This is where Riot's raw
 * per-match data becomes the aggregate matchup win rates the site displays.
 *
 * Matchup definition (mirrors src/lib/counterScore.ts §6):
 *   For each match, for each lane, the two opposing laners form two ORDERED
 *   pairs (A vs B and B vs A). A wins the pair iff A's team won. We sum games
 *   and wins across all matches in a patch, then convert win rate -> counter
 *   score using the SHARED formula imported below (single source of truth).
 *
 * Schedule this to run after each ingestion batch / once per patch.
 *
 * Usage:  DATABASE_URL=… npm run aggregate
 */

import { Pool } from 'pg';
import { getDatabaseUrl } from '../config';
// Reuse the EXACT front-end formula so sample and real data are identical.
import { computeCounterScore, isConfident } from '../../src/lib/counterScore';

interface PairRow {
  champion_id: string;
  opponent_id: string;
  lane: string;
  patch: string;
  games: number;
  wins: number;
}

async function rebuildMatchupStats(pool: Pool): Promise<number> {
  // Self-join opposing laners within each match to build ordered matchup pairs.
  const { rows } = await pool.query<PairRow>(`
    SELECT a.champion_id,
           b.champion_id AS opponent_id,
           a.lane,
           m.patch,
           COUNT(*)::int AS games,
           SUM(CASE WHEN a.win THEN 1 ELSE 0 END)::int AS wins
    FROM participants a
    JOIN participants b
      ON a.match_id = b.match_id
     AND a.lane = b.lane
     AND a.team_id <> b.team_id
    JOIN matches m ON m.match_id = a.match_id
    GROUP BY a.champion_id, b.champion_id, a.lane, m.patch
  `);

  await pool.query('TRUNCATE matchup_stats');

  for (const r of rows) {
    const winRate = r.games > 0 ? r.wins / r.games : 0;
    await pool.query(
      `INSERT INTO matchup_stats
         (champion_id, opponent_id, lane, patch, games, wins, win_rate, counter_score, low_confidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (champion_id, opponent_id, lane, patch) DO UPDATE SET
         games = EXCLUDED.games,
         wins = EXCLUDED.wins,
         win_rate = EXCLUDED.win_rate,
         counter_score = EXCLUDED.counter_score,
         low_confidence = EXCLUDED.low_confidence,
         computed_at = now()`,
      [
        r.champion_id,
        r.opponent_id,
        r.lane,
        r.patch,
        r.games,
        r.wins,
        winRate,
        computeCounterScore(winRate),
        !isConfident(r.games),
      ],
    );
  }
  return rows.length;
}

async function rebuildChampionStats(pool: Pool): Promise<number> {
  // Per-champion overall win rate + lane split, plus pick rate vs total matches.
  const { rows } = await pool.query<{
    champion_id: string;
    patch: string;
    games: number;
    wins: number;
    lane_top: number;
    lane_jungle: number;
    lane_mid: number;
    lane_bot: number;
    lane_support: number;
    total_matches: number;
  }>(`
    WITH totals AS (
      SELECT patch, COUNT(*)::int AS total_matches
      FROM matches GROUP BY patch
    )
    SELECT p.champion_id,
           m.patch,
           COUNT(*)::int AS games,
           SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::int AS wins,
           SUM(CASE WHEN p.lane='top' THEN 1 ELSE 0 END)::int AS lane_top,
           SUM(CASE WHEN p.lane='jungle' THEN 1 ELSE 0 END)::int AS lane_jungle,
           SUM(CASE WHEN p.lane='mid' THEN 1 ELSE 0 END)::int AS lane_mid,
           SUM(CASE WHEN p.lane='bot' THEN 1 ELSE 0 END)::int AS lane_bot,
           SUM(CASE WHEN p.lane='support' THEN 1 ELSE 0 END)::int AS lane_support,
           t.total_matches
    FROM participants p
    JOIN matches m ON m.match_id = p.match_id
    JOIN totals t ON t.patch = m.patch
    GROUP BY p.champion_id, m.patch, t.total_matches
  `);

  await pool.query('TRUNCATE champion_stats');

  for (const r of rows) {
    const winRate = r.games > 0 ? r.wins / r.games : 0;
    const pickRate = r.total_matches > 0 ? r.games / r.total_matches : 0;
    const laneTotal =
      r.lane_top + r.lane_jungle + r.lane_mid + r.lane_bot + r.lane_support || 1;
    await pool.query(
      `INSERT INTO champion_stats
         (champion_id, patch, games, wins, win_rate, pick_rate,
          lane_top, lane_jungle, lane_mid, lane_bot, lane_support)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (champion_id, patch) DO UPDATE SET
         games = EXCLUDED.games, wins = EXCLUDED.wins,
         win_rate = EXCLUDED.win_rate, pick_rate = EXCLUDED.pick_rate,
         lane_top = EXCLUDED.lane_top, lane_jungle = EXCLUDED.lane_jungle,
         lane_mid = EXCLUDED.lane_mid, lane_bot = EXCLUDED.lane_bot,
         lane_support = EXCLUDED.lane_support, computed_at = now()`,
      [
        r.champion_id,
        r.patch,
        r.games,
        r.wins,
        winRate,
        pickRate,
        r.lane_top / laneTotal,
        r.lane_jungle / laneTotal,
        r.lane_mid / laneTotal,
        r.lane_bot / laneTotal,
        r.lane_support / laneTotal,
      ],
    );
  }
  return rows.length;
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    console.log('Rebuilding champion_stats …');
    const champRows = await rebuildChampionStats(pool);
    console.log(`  ${champRows} champion/patch rows.`);

    console.log('Rebuilding matchup_stats …');
    const pairRows = await rebuildMatchupStats(pool);
    console.log(`  ${pairRows} matchup rows.`);

    console.log('Aggregation complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Aggregation failed:', err);
  process.exit(1);
});
