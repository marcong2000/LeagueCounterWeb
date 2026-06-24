/**
 * Token-bucket rate limiter + throttling queue for the Riot API (Phase 2).
 * =======================================================================
 *
 * Riot enforces several layers of limits simultaneously:
 *   - per-region APPLICATION rate limits (e.g. 100 req / 120s on prod keys),
 *   - per-METHOD rate limits (vary by endpoint),
 *   - and short-window burst limits (e.g. 20 req / 1s).
 *
 * This limiter lets you register multiple windows; a request only proceeds when
 * EVERY window has spare capacity. On HTTP 429 the caller should honour the
 * `Retry-After` header via `pause()` (see riotClient.ts) — respecting the
 * server is always more reliable than guessing client-side.
 */

export interface RateWindow {
  /** Max requests allowed within `intervalMs`. */
  limit: number;
  /** Window length in milliseconds. */
  intervalMs: number;
}

export class RateLimiter {
  private windows: { window: RateWindow; hits: number[] }[];
  private pausedUntil = 0;

  constructor(windows: RateWindow[]) {
    this.windows = windows.map((window) => ({ window, hits: [] }));
  }

  /** Force a global pause (e.g. after a 429 Retry-After). */
  pause(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, Date.now() + ms);
  }

  /** Resolve once it's safe to make one request; records the request. */
  async acquire(): Promise<void> {
    // Loop until all windows (and any pause) permit a request.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const now = Date.now();

      if (now < this.pausedUntil) {
        await sleep(this.pausedUntil - now);
        continue;
      }

      let waitMs = 0;
      for (const w of this.windows) {
        // Drop timestamps outside the window.
        const cutoff = now - w.window.intervalMs;
        w.hits = w.hits.filter((t) => t > cutoff);
        if (w.hits.length >= w.window.limit) {
          // Wait until the oldest hit ages out of this window.
          waitMs = Math.max(waitMs, w.hits[0] + w.window.intervalMs - now);
        }
      }

      if (waitMs <= 0) {
        const ts = Date.now();
        for (const w of this.windows) w.hits.push(ts);
        return;
      }

      await sleep(waitMs);
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/**
 * Default windows that match a typical Riot PRODUCTION key. Adjust to the exact
 * limits printed in the Riot developer portal for your approved app.
 */
export const DEFAULT_PROD_WINDOWS: RateWindow[] = [
  { limit: 500, intervalMs: 10_000 }, // burst window
  { limit: 30_000, intervalMs: 600_000 }, // sustained window
];

/**
 * Limits for a PERSONAL / DEVELOPMENT key: 20 requests/sec and 100 requests/2
 * minutes. Staying just under these avoids the constant 429s (and the long
 * Retry-After pauses) you get if you drive a dev key at production speed.
 */
export const DEFAULT_DEV_WINDOWS: RateWindow[] = [
  { limit: 20, intervalMs: 1_000 },
  { limit: 100, intervalMs: 120_000 },
];

export type RateProfile = 'dev' | 'prod';

/** Pick the appropriate windows for the configured key tier. */
export function windowsForProfile(profile: RateProfile): RateWindow[] {
  return profile === 'prod' ? DEFAULT_PROD_WINDOWS : DEFAULT_DEV_WINDOWS;
}

