/**
 * COUNTER SCORE — the core computed metric.
 * =========================================
 *
 * The Riot API does NOT return aggregate matchup win rates. We compute them
 * ourselves (Phase 2) and convert each matchup win rate into a single,
 * human-friendly "counter score". This module is the single source of truth for
 * that formula so Phase 1 sample data and Phase 2 real data are identical in
 * meaning. Tune the constants here and both phases update together.
 *
 * Definition
 * ----------
 * For an ordered pair (champion A in lane L vs opponent B):
 *   1. Gather every sampled game where A faced B in lane L.
 *   2. winRate = wins(A) / games.
 *   3. counterScore = clamp( (winRate - 0.5) * SCORE_SCALE, -MAX, +MAX )
 *
 * Scale
 * -----
 *   - 50% win rate  -> 0   (neutral midpoint)
 *   - >50%          -> positive  (A counters B)
 *   - <50%          -> negative  (A is countered by B)
 *   - SCORE_SCALE = 200, so a 60% win rate -> +20, a 40% win rate -> -20.
 *   - Clamped to [-50, +50] so extreme small-sample swings stay readable.
 *
 * Confidence
 * ----------
 * Matchups with fewer than MIN_GAMES sampled games are flagged
 * `lowConfidence` and should be visually de-emphasised or hidden in the UI.
 */

/** Win rate (fraction) is mapped to a score by multiplying its delta from 0.5. */
export const SCORE_SCALE = 200;

/** Hard clamp on the absolute counter score. */
export const MAX_SCORE = 50;

/** Minimum sampled games for a matchup to be considered confident. */
export const MIN_GAMES = 80;

/** Clamp a number into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert a matchup win rate (fraction 0..1) into a counter score.
 * Rounded to one decimal place for display stability.
 */
export function computeCounterScore(winRate: number): number {
  const raw = (winRate - 0.5) * SCORE_SCALE;
  return Math.round(clamp(raw, -MAX_SCORE, MAX_SCORE) * 10) / 10;
}

/** Whether a matchup has enough games to be trusted. */
export function isConfident(games: number): boolean {
  return games >= MIN_GAMES;
}

/** Bucket a counter score into a qualitative label for the UI. */
export function counterScoreLabel(score: number): string {
  if (score >= 15) return 'Strong counter';
  if (score >= 5) return 'Favoured';
  if (score > -5) return 'Even';
  if (score > -15) return 'Unfavoured';
  return 'Hard counter';
}
