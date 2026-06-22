/**
 * THE DATA-ACCESS BOUNDARY (§5 of the build spec).
 * ================================================
 *
 * This is the ONLY module the front-end imports for champion/matchup data.
 * The pages never import the sample generator or (in Phase 2) the database
 * directly. That indirection is what makes the sample -> real swap a drop-in:
 *
 *   Phase 1 (now):   these functions assemble champion data from Data Dragon
 *                    (names/images) + the synthetic sample generator (stats).
 *   Phase 2 (later): replace the bodies below with reads from the computed
 *                    `matchup_stats` Postgres table. The SIGNATURES and the
 *                    returned TYPES stay identical, so no page changes.
 *
 * Public API:
 *   getAllChampions(): Promise<ChampionSummary[]>
 *   getChampion(slug): Promise<ChampionDetail | null>
 *   getMatchups(slug, lane?): Promise<Matchup[]>
 *   isSampleData(): boolean   // drives the "Sample data" UI badge
 */

import {
  championIconUrl,
  championSplashUrl,
  getCurrentVersion,
  getRoster,
  type DDragonChampion,
} from '../ddragon';
import {
  generateChampionStats,
  generateMatchups,
  type ChampionStats,
} from './sampleData';
import type {
  ChampionDetail,
  ChampionSummary,
  Lane,
  Matchup,
} from '../types';

/**
 * Flips the whole UI between "synthetic numbers" and "real numbers" messaging.
 * In Phase 2, set this to false (or derive it from an env var) once the data
 * layer reads from the database.
 */
const SAMPLE_DATA_MODE = true;

export function isSampleData(): boolean {
  return SAMPLE_DATA_MODE;
}

// ---------------------------------------------------------------------------
// Assembled-data cache (process lifetime)
// ---------------------------------------------------------------------------

interface AssembledData {
  version: string;
  summaries: ChampionSummary[];
  detailsById: Map<string, ChampionDetail>;
}

let cache: AssembledData | null = null;

function bestAndWorst(matchups: Matchup[]): {
  best: ChampionSummary['bestCounter'];
  worst: ChampionSummary['worstCounter'];
} {
  const confident = matchups.filter((m) => !m.lowConfidence);
  const pool = confident.length > 0 ? confident : matchups;
  if (pool.length === 0) return { best: null, worst: null };

  let best = pool[0];
  let worst = pool[0];
  for (const m of pool) {
    if (m.counterScore > best.counterScore) best = m;
    if (m.counterScore < worst.counterScore) worst = m;
  }
  return {
    best: {
      opponentId: best.opponentId,
      opponentName: best.opponentName,
      counterScore: best.counterScore,
    },
    worst: {
      opponentId: worst.opponentId,
      opponentName: worst.opponentName,
      counterScore: worst.counterScore,
    },
  };
}

function buildDetail(
  champ: DDragonChampion,
  stats: ChampionStats,
  version: string,
  matchups: Matchup[],
): ChampionDetail {
  const { best, worst } = bestAndWorst(matchups);
  return {
    id: champ.id,
    name: champ.name,
    title: champ.title,
    tags: champ.tags,
    iconUrl: championIconUrl(version, champ.id),
    splashUrl: championSplashUrl(champ.id),
    blurb: champ.blurb,
    winRate: stats.winRate,
    pickRate: stats.pickRate,
    laneDistribution: stats.laneDistribution,
    primaryLanes: stats.primaryLanes,
    bestCounter: best,
    worstCounter: worst,
    tipCount: stats.tips.length,
    tips: stats.tips,
    matchups,
  };
}

/** Assemble (and cache) the full dataset from Data Dragon + sample stats. */
async function assemble(): Promise<AssembledData> {
  if (cache) return cache;

  const [version, roster] = await Promise.all([
    getCurrentVersion(),
    getRoster(),
  ]);

  // First pass: per-champion aggregate stats (needed before matchups).
  const statsById = new Map<string, ChampionStats>();
  for (const champ of roster) {
    statsById.set(champ.id, generateChampionStats(champ));
  }

  // Second pass: matchups + assembled details.
  const detailsById = new Map<string, ChampionDetail>();
  for (const champ of roster) {
    const stats = statsById.get(champ.id)!;
    const matchups = generateMatchups(champ, roster, statsById);
    detailsById.set(champ.id, buildDetail(champ, stats, version, matchups));
  }

  const summaries: ChampionSummary[] = roster.map((champ) => {
    const d = detailsById.get(champ.id)!;
    // Strip the detail-only fields to produce a lean summary.
    const { blurb, splashUrl, matchups, tips, ...summary } = d;
    return summary;
  });
  summaries.sort((a, b) => a.name.localeCompare(b.name));

  cache = { version, summaries, detailsById };
  return cache;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** All champions for the home index. */
export async function getAllChampions(): Promise<ChampionSummary[]> {
  const { summaries } = await assemble();
  return summaries;
}

/** Full detail for one champion by slug (Data Dragon id), or null. */
export async function getChampion(slug: string): Promise<ChampionDetail | null> {
  const { detailsById } = await assemble();
  return detailsById.get(slug) ?? null;
}

/** Matchups for a champion, optionally filtered to a single lane. */
export async function getMatchups(
  slug: string,
  lane?: Lane,
): Promise<Matchup[]> {
  const detail = await getChampion(slug);
  if (!detail) return [];
  const matchups = lane
    ? detail.matchups.filter((m) => m.lane === lane)
    : detail.matchups;
  return matchups;
}

/** Convenience: list of all champion slugs (for static generation). */
export async function getAllChampionSlugs(): Promise<string[]> {
  const { summaries } = await assemble();
  return summaries.map((c) => c.id);
}

/** The resolved Data Dragon patch version (for display / attribution). */
export async function getDataVersion(): Promise<string> {
  const { version } = await assemble();
  return version;
}
