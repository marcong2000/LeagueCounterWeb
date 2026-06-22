/** Small display formatting helpers shared across components. */

/** Format a fraction (0..1) as a percentage string, e.g. 0.512 -> "51.2%". */
export function pct(fraction: number, decimals = 1): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

/** Format a signed counter score, e.g. 12.4 -> "+12.4", -7 -> "-7.0". */
export function signedScore(score: number): string {
  const sign = score > 0 ? '+' : '';
  return `${sign}${score.toFixed(1)}`;
}

/** Compact game-count formatting, e.g. 1340 -> "1.3k". */
export function compactGames(games: number): string {
  if (games >= 1000) return `${(games / 1000).toFixed(1)}k`;
  return String(games);
}
