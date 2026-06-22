/**
 * PHASE 1 SAMPLE PROVIDER — synthetic statistics over the Data Dragon roster.
 * ===========================================================================
 *
 * Implements the shared `DataProvider` contract (src/lib/types.ts) using the
 * deterministic sample generator (./sampleData). The router in ./index.ts
 * selects this provider by default; the Phase 2 DB provider (./db.ts) is the
 * drop-in replacement once real data has been ingested + aggregated.
 *
 * All numbers here are synthetic — the UI shows a "Sample data" badge whenever
 * this provider is active.
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
  DataProvider,
  Lane,
  Matchup,
} from '../types';

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

export const sampleProvider: DataProvider = {
  async getAllChampions(): Promise<ChampionSummary[]> {
    const { summaries } = await assemble();
    return summaries;
  },

  async getChampion(slug: string): Promise<ChampionDetail | null> {
    const { detailsById } = await assemble();
    return detailsById.get(slug) ?? null;
  },

  async getMatchups(slug: string, lane?: Lane): Promise<Matchup[]> {
    const detail = await this.getChampion(slug);
    if (!detail) return [];
    return lane ? detail.matchups.filter((m) => m.lane === lane) : detail.matchups;
  },

  async getAllChampionSlugs(): Promise<string[]> {
    const { summaries } = await assemble();
    return summaries.map((c) => c.id);
  },

  async getDataVersion(): Promise<string> {
    const { version } = await assemble();
    return version;
  },
};
