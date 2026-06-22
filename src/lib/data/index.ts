/**
 * THE DATA-ACCESS BOUNDARY (§5 of the build spec) — provider router.
 * =================================================================
 *
 * This is the ONLY module the front-end imports for champion/matchup data. It
 * selects a `DataProvider` implementation at runtime and forwards every call to
 * it, so swapping data sources never touches page code:
 *
 *   DATA_SOURCE unset | "sample"  -> sampleProvider  (synthetic Phase 1 data)
 *   DATA_SOURCE = "db"            -> dbProvider       (real Phase 2 computed data)
 *
 * Graceful fallback: if DATA_SOURCE=db but the database has no aggregated rows
 * yet (e.g. before the first ingest+aggregate run), we log a warning and fall
 * back to the sample provider so the site never renders blank. `isSampleData()`
 * reflects the provider actually in use, so the "Sample data" badge stays honest.
 *
 * Public API (all async):
 *   getAllChampions(): Promise<ChampionSummary[]>
 *   getChampion(slug): Promise<ChampionDetail | null>
 *   getMatchups(slug, lane?): Promise<Matchup[]>
 *   getAllChampionSlugs(): Promise<string[]>
 *   getDataVersion(): Promise<string>
 *   isSampleData(): Promise<boolean>   // drives the "Sample data" UI badge
 */

import { sampleProvider } from './sample';
import { dbProvider, hasData } from './db';
import type {
  ChampionDetail,
  ChampionSummary,
  DataProvider,
  Lane,
  Matchup,
} from '../types';

interface ResolvedProvider {
  provider: DataProvider;
  isSample: boolean;
}

let resolved: ResolvedProvider | null = null;

/** Resolve (and memoise) the active provider for this server process. */
async function resolve(): Promise<ResolvedProvider> {
  if (resolved) return resolved;

  const wantDb = process.env.DATA_SOURCE === 'db';
  if (wantDb) {
    if (await hasData()) {
      resolved = { provider: dbProvider, isSample: false };
    } else {
      console.warn(
        '[data] DATA_SOURCE=db but no aggregated rows were found. ' +
          'Falling back to sample data — run `npm run ingest` then `npm run aggregate`.',
      );
      resolved = { provider: sampleProvider, isSample: true };
    }
  } else {
    resolved = { provider: sampleProvider, isSample: true };
  }
  return resolved;
}

/** Whether the active provider is the synthetic sample source. */
export async function isSampleData(): Promise<boolean> {
  return (await resolve()).isSample;
}

export async function getAllChampions(): Promise<ChampionSummary[]> {
  return (await resolve()).provider.getAllChampions();
}

export async function getChampion(slug: string): Promise<ChampionDetail | null> {
  return (await resolve()).provider.getChampion(slug);
}

export async function getMatchups(slug: string, lane?: Lane): Promise<Matchup[]> {
  return (await resolve()).provider.getMatchups(slug, lane);
}

export async function getAllChampionSlugs(): Promise<string[]> {
  return (await resolve()).provider.getAllChampionSlugs();
}

export async function getDataVersion(): Promise<string> {
  return (await resolve()).provider.getDataVersion();
}
