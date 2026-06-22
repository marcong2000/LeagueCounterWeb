/**
 * Shared domain types used by BOTH phases.
 *
 * Phase 1 (sample data) and Phase 2 (real DB-computed data) must conform to
 * these exact shapes so the front-end never has to change when the data source
 * is swapped. See `src/lib/data/index.ts` for the single data-access boundary.
 */

/** The five canonical League of Legends lanes / roles. */
export type Lane = 'top' | 'jungle' | 'mid' | 'bot' | 'support';

export const LANES: Lane[] = ['top', 'jungle', 'mid', 'bot', 'support'];

export const LANE_LABELS: Record<Lane, string> = {
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  bot: 'Bot',
  support: 'Support',
};

/** Per-lane play distribution for a champion (fractions that sum to ~1). */
export type LaneDistribution = Record<Lane, number>;

/**
 * A single ordered matchup: this champion (the "subject") versus `opponentId`
 * in a specific `lane`.
 */
export interface Matchup {
  /** Data Dragon champion id of the opponent, e.g. "Garen". */
  opponentId: string;
  /** Human-readable opponent name, e.g. "Garen". */
  opponentName: string;
  /** Lane the matchup was played in. */
  lane: Lane;
  /** Number of sampled games the stats are derived from. */
  games: number;
  /** Subject champion's win rate vs the opponent, as a fraction 0..1. */
  winRate: number;
  /**
   * Derived metric on the scale defined in `src/lib/counterScore.ts`.
   * Positive => subject counters the opponent; negative => subject is countered.
   */
  counterScore: number;
  /**
   * True when `games` is below the confidence threshold and the numbers should
   * be treated as low-confidence (flagged or hidden in the UI).
   */
  lowConfidence: boolean;
}

/**
 * Lightweight champion record used by the home index / listings.
 */
export interface ChampionSummary {
  /** Data Dragon id, also used as the URL slug, e.g. "MissFortune". */
  id: string;
  /** Display name, e.g. "Miss Fortune". */
  name: string;
  /** Champion title, e.g. "the Bounty Hunter". */
  title: string;
  /** Data Dragon class tags, e.g. ["Marksman"]. */
  tags: string[];
  /** Square icon URL (Data Dragon). */
  iconUrl: string;
  /** Overall win rate as a fraction 0..1. */
  winRate: number;
  /** Overall pick rate as a fraction 0..1. */
  pickRate: number;
  /** Per-lane play distribution. */
  laneDistribution: LaneDistribution;
  /** Primary lanes, ordered by play rate (top two are most relevant). */
  primaryLanes: Lane[];
  /** Best counter (highest counter score) across all lanes, if any. */
  bestCounter: { opponentId: string; opponentName: string; counterScore: number } | null;
  /** Worst matchup (lowest counter score) across all lanes, if any. */
  worstCounter: { opponentId: string; opponentName: string; counterScore: number } | null;
  /** Number of strategy tips available for this champion. */
  tipCount: number;
}

/**
 * Full champion record used by the detail page. Extends the summary with
 * static splash/lore data and the full matchup list.
 */
export interface ChampionDetail extends ChampionSummary {
  /** Short lore blurb from Data Dragon. */
  blurb: string;
  /** Loading-screen splash URL (Data Dragon). */
  splashUrl: string;
  /** All matchups for this champion, across every lane. */
  matchups: Matchup[];
  /** Free-form strategy tips (synthetic in Phase 1). */
  tips: string[];
}
