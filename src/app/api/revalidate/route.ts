/**
 * On-demand revalidation endpoint (optional, Phase 2).
 * ============================================================================
 *
 * Champion pages are statically cached (revalidate: 86400). After an aggregation
 * run produces fresh `matchup_stats`, the aggregation job (or a cron) can POST
 * here to refresh the home index and all champion pages immediately instead of
 * waiting for the daily revalidation window.
 *
 * Auth: requires the secret `REVALIDATE_TOKEN` env var, supplied either as
 * `?token=` or an `x-revalidate-token` header. If the env var is unset the
 * endpoint is disabled (returns 503) so it can't be abused on the public site.
 *
 * Example:
 *   curl -X POST "https://your-site/api/revalidate?token=$REVALIDATE_TOKEN"
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { revalidated: false, error: 'REVALIDATE_TOKEN not configured' },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const provided =
    url.searchParams.get('token') ?? request.headers.get('x-revalidate-token');
  if (provided !== expected) {
    return NextResponse.json(
      { revalidated: false, error: 'invalid token' },
      { status: 401 },
    );
  }

  // Refresh the index and every champion detail page.
  revalidatePath('/');
  revalidatePath('/champion/[slug]', 'page');

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
