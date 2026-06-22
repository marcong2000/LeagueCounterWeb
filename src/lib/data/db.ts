/**
 * PHASE 2 DB PROVIDER — real computed statistics from PostgreSQL.
 * ============================================================================
 *
 * Implements the same `DataProvider` contract (src/lib/types.ts) as the Phase 1
 * sample provider, but reads from the computed `champion_stats` / `matchup_stats`
 * tables produced by `backend/aggregate/job.ts`. Champion names/titles/tags and
 * image URLs still come from Data Dragon (see ddragon.ts); only the statistics
 * come from the DB.
 *
 * Activation is handled by the router in ./index.ts via the DATA_SOURCE env var
 * (`DATA_SOURCE=db`). When DATA_SOURCE is unset/`sample`, this module is never
 * queried and no database connection is opened — so Phase 1 needs no DB.
 */

import { Pool } from 'pg';
import {
  championIconUrl,
  championSplashUrl,
  getCurrentVersion,
  getRosterChampion,
  getRoster,
} from '../ddragon';
import {
  LANES,
  type ChampionDetail,
  type ChampionSummary,
  type DataProvider,
  type Lane,
  type Matchup,
} from '../types';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required to use the Phase 2 DB provider.');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

/**
 * True when the DB has at least one aggregated champion row. The router uses
 * this to fall back to sample data if Phase 2 tables are empty (e.g. before the
 * first aggregation run), so the site never renders blank.
 */
export async function hasData(): Promise<boolean> {
  try {
    const { rows } = await getPool().query<{ exists: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM champion_stats LIMIT 1) AS exists',
    );
    return rows[0]?.exists ?? false;
  } catch (err) {
    console.warn('[data] DB availability check failed:', (err as Error).message);
    return false;
  }
}

/** Latest patch present in champion_stats. */
async function latestPatch(): Promise<string> {
  const { rows } = await getPool().query<{ patch: string }>(
    'SELECT patch FROM champion_stats ORDER BY patch DESC LIMIT 1',
  );
  return rows[0]?.patch ?? (await getCurrentVersion());
}

async function getMatchups(slug: string, lane?: Lane): Promise<Matchup[]> {
  const patch = await latestPatch();
  const params: (string | number)[] = [slug, patch];
  let sql = `
    SELECT opponent_id, lane, games, win_rate, counter_score, low_confidence
    FROM matchup_stats
    WHERE champion_id = $1 AND patch = $2`;
  if (lane) {
    sql += ' AND lane = $3';
    params.push(lane);
  }
  const { rows } = await getPool().query(sql, params);
  // Resolve opponent display names from Data Dragon.
  const roster = await getRoster();
  const nameById = new Map(roster.map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    opponentId: r.opponent_id,
    opponentName: nameById.get(r.opponent_id) ?? r.opponent_id,
    lane: r.lane as Lane,
    games: r.games,
    winRate: r.win_rate,
    counterScore: r.counter_score,
    lowConfidence: r.low_confidence,
  }));
}

function bestWorst(matchups: Matchup[]) {
  const pool = matchups.filter((m) => !m.lowConfidence);
  const list = pool.length ? pool : matchups;
  if (!list.length) return { best: null, worst: null };
  let best = list[0];
  let worst = list[0];
  for (const m of list) {
    if (m.counterScore > best.counterScore) best = m;
    if (m.counterScore < worst.counterScore) worst = m;
  }
  const pack = (m: Matchup) => ({
    opponentId: m.opponentId,
    opponentName: m.opponentName,
    counterScore: m.counterScore,
  });
  return { best: pack(best), worst: pack(worst) };
}

async function getChampion(slug: string): Promise<ChampionDetail | null> {
  const champ = await getRosterChampion(slug);
  if (!champ) return null;
  const patch = await latestPatch();
  const version = await getCurrentVersion();

  const { rows } = await getPool().query(
    `SELECT win_rate, pick_rate, lane_top, lane_jungle, lane_mid, lane_bot, lane_support
     FROM champion_stats WHERE champion_id = $1 AND patch = $2`,
    [slug, patch],
  );
  const s = rows[0];
  if (!s) return null;

  const laneDistribution = {
    top: s.lane_top,
    jungle: s.lane_jungle,
    mid: s.lane_mid,
    bot: s.lane_bot,
    support: s.lane_support,
  };
  const primaryLanes = [...LANES].sort(
    (a, b) => laneDistribution[b] - laneDistribution[a],
  );
  const matchups = await getMatchups(slug);
  const { best, worst } = bestWorst(matchups);

  return {
    id: champ.id,
    name: champ.name,
    title: champ.title,
    tags: champ.tags,
    iconUrl: championIconUrl(version, champ.id),
    splashUrl: championSplashUrl(champ.id),
    blurb: champ.blurb,
    winRate: s.win_rate,
    pickRate: s.pick_rate,
    laneDistribution,
    primaryLanes,
    bestCounter: best,
    worstCounter: worst,
    tipCount: 0, // tips would come from an editorial table in production
    tips: [],
    matchups,
  };
}

async function getAllChampions(): Promise<ChampionSummary[]> {
  const roster = await getRoster();
  const details = await Promise.all(roster.map((c) => getChampion(c.id)));
  return details
    .filter((d): d is ChampionDetail => d !== null)
    .map(({ blurb, splashUrl, matchups, tips, ...summary }) => summary)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function getAllChampionSlugs(): Promise<string[]> {
  const champs = await getAllChampions();
  return champs.map((c) => c.id);
}

async function getDataVersion(): Promise<string> {
  return getCurrentVersion();
}

export const dbProvider: DataProvider = {
  getAllChampions,
  getChampion,
  getMatchups,
  getAllChampionSlugs,
  getDataVersion,
};
