/**
 * SYNTHETIC SAMPLE DATA — Phase 1 placeholder. NOT real match data.
 * =================================================================
 *
 * Every win rate, pick rate, lane split and matchup produced here is generated
 * by a seeded pseudo-random generator keyed off champion ids, so the numbers
 * are:
 *   - plausible (win rates cluster ~45–55%, pick rates are small),
 *   - deterministic (stable across renders / reloads), and
 *   - internally consistent (counter scores derive from the SAME formula used
 *     in Phase 2 — see `src/lib/counterScore.ts`).
 *
 * In Phase 2 this entire module is replaced by reads from the computed
 * `matchup_stats` table; the front-end is unaffected because everything flows
 * through `src/lib/data/index.ts`.
 *
 * The UI surfaces a "Sample data" badge wherever these numbers appear.
 */

import { computeCounterScore, isConfident } from '../counterScore';
import { LANES, type Lane, type LaneDistribution, type Matchup } from '../types';
import type { DDragonChampion } from '../ddragon';

// ---------------------------------------------------------------------------
// Deterministic PRNG helpers
// ---------------------------------------------------------------------------

/** FNV-1a string hash -> unsigned 32-bit int. */
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG -> function yielding floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [min, max) from a generator. */
function range(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

// ---------------------------------------------------------------------------
// Per-champion aggregate stats
// ---------------------------------------------------------------------------

export interface ChampionStats {
  winRate: number;
  pickRate: number;
  laneDistribution: LaneDistribution;
  primaryLanes: Lane[];
  tips: string[];
}

/** Base lane affinity from Data Dragon class tags. */
function laneAffinityFromTags(tags: string[]): LaneDistribution {
  const w: LaneDistribution = { top: 0.05, jungle: 0.05, mid: 0.05, bot: 0.05, support: 0.05 };
  for (const tag of tags) {
    switch (tag) {
      case 'Marksman':
        w.bot += 0.8;
        break;
      case 'Support':
        w.support += 0.8;
        break;
      case 'Mage':
        w.mid += 0.45;
        w.support += 0.2;
        break;
      case 'Assassin':
        w.mid += 0.4;
        w.jungle += 0.25;
        break;
      case 'Fighter':
        w.top += 0.45;
        w.jungle += 0.3;
        break;
      case 'Tank':
        w.top += 0.35;
        w.support += 0.2;
        w.jungle += 0.15;
        break;
    }
  }
  return w;
}

function normalizeDistribution(w: LaneDistribution): LaneDistribution {
  const total = LANES.reduce((s, l) => s + w[l], 0);
  const out = {} as LaneDistribution;
  for (const l of LANES) out[l] = Math.round((w[l] / total) * 1000) / 1000;
  return out;
}

const TIP_TEMPLATES = [
  'Respect early trades — back off when their key ability is up.',
  'Ward the river bush before level 3 to dodge ganks.',
  'Build the matchup-specific defensive item before completing your second component.',
  'Track their summoner spells; punish hard once the escape is down.',
  'Freeze near your turret when behind to deny easy farm.',
  'Look to roam after pushing the wave once their jungler shows bottom.',
  'Save your dash for disengage rather than aggression in this lane.',
  'Trade short and disengage — long fights favour them.',
];

/** Generate deterministic aggregate stats for one champion. */
export function generateChampionStats(champ: DDragonChampion): ChampionStats {
  const seed = hashString(champ.id);
  const rng = mulberry32(seed);

  // Lane distribution: tag affinity + deterministic noise.
  const affinity = laneAffinityFromTags(champ.tags);
  for (const l of LANES) affinity[l] *= range(rng, 0.6, 1.4);
  const laneDistribution = normalizeDistribution(affinity);

  const primaryLanes = [...LANES].sort(
    (a, b) => laneDistribution[b] - laneDistribution[a],
  );

  // Win rate clustered around 50%, mostly within 45–55%.
  const winRate = Math.round(range(rng, 0.455, 0.545) * 1000) / 1000;
  // Pick rate: small, long-tailed.
  const pickRate = Math.round(range(rng, 0.005, 0.16) * 1000) / 1000;

  // Stable selection of 3 tips.
  const tipCount = 3;
  const tips: string[] = [];
  const pool = [...TIP_TEMPLATES];
  for (let i = 0; i < tipCount && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    tips.push(pool.splice(idx, 1)[0]);
  }

  return { winRate, pickRate, laneDistribution, primaryLanes, tips };
}

// ---------------------------------------------------------------------------
// Matchups
// ---------------------------------------------------------------------------

/** Lanes a champion is "present" in for matchup purposes. */
function lanesPlayed(dist: LaneDistribution): Lane[] {
  return LANES.filter((l) => dist[l] >= 0.15);
}

/**
 * Generate the full matchup list for `subject`, computed deterministically from
 * pair hashes. Opponents in a lane are other champions that also play that lane.
 */
export function generateMatchups(
  subject: DDragonChampion,
  roster: DDragonChampion[],
  statsById: Map<string, ChampionStats>,
): Matchup[] {
  const subjectStats = statsById.get(subject.id);
  if (!subjectStats) return [];

  const matchups: Matchup[] = [];
  const subjectLanes = lanesPlayed(subjectStats.laneDistribution);

  for (const lane of subjectLanes) {
    // Candidate opponents: champions that also play this lane.
    const candidates = roster.filter((c) => {
      if (c.id === subject.id) return false;
      const s = statsById.get(c.id);
      return s ? s.laneDistribution[lane] >= 0.15 : false;
    });

    // Deterministic ordering for this (subject, lane) pair.
    candidates.sort(
      (a, b) =>
        hashString(`${subject.id}|${lane}|${a.id}`) -
        hashString(`${subject.id}|${lane}|${b.id}`),
    );

    const take = Math.min(candidates.length, 16);
    for (let i = 0; i < take; i++) {
      const opp = candidates[i];
      const pairSeed = hashString(`${subject.id}|${opp.id}|${lane}`);
      const rng = mulberry32(pairSeed);

      // Win rate vs this opponent, biased slightly by overall win rate.
      const bias = (subjectStats.winRate - 0.5) * 0.4;
      let winRate = 0.5 + bias + range(rng, -0.13, 0.13);
      winRate = Math.max(0.3, Math.min(0.7, winRate));
      winRate = Math.round(winRate * 1000) / 1000;

      const games = Math.round(range(rng, 25, 1400));

      matchups.push({
        opponentId: opp.id,
        opponentName: opp.name,
        lane,
        games,
        winRate,
        counterScore: computeCounterScore(winRate),
        lowConfidence: !isConfident(games),
      });
    }
  }

  return matchups;
}
