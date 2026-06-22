/**
 * Data Dragon integration — static champion data (Phase 1, free, NO API key).
 * ===========================================================================
 *
 * Data Dragon is Riot's free static CDN. It supplies champion ids, names,
 * titles, tags, lore blurbs and image URLs. It does NOT require an API key and
 * is safe to call from the server at build/request time.
 *
 * Key behaviours:
 *  - The current patch version is resolved once and cached, so image URLs are
 *    never hardcoded to a stale patch (see `getCurrentVersion`).
 *  - Every fetch falls back to the bundled snapshot (`championsSnapshot.ts`) if
 *    the CDN is unreachable, so the site always renders.
 */

import {
  CHAMPIONS_SNAPSHOT,
  FALLBACK_VERSION,
  type SnapshotChampion,
} from './data/championsSnapshot';

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';
const LOCALE = 'en_US';

/** Revalidate static data daily; patches ship roughly every two weeks. */
const REVALIDATE_SECONDS = 60 * 60 * 24;

export interface DDragonChampion extends SnapshotChampion {
  blurb: string;
}

// ---------------------------------------------------------------------------
// Version resolution (cached per server process)
// ---------------------------------------------------------------------------

let cachedVersion: string | null = null;
let cachedVersionAt = 0;
const VERSION_TTL_MS = REVALIDATE_SECONDS * 1000;

/**
 * Resolve and cache the current Data Dragon patch version. Falls back to a
 * bundled constant if the CDN cannot be reached.
 */
export async function getCurrentVersion(): Promise<string> {
  const now = Date.now();
  if (cachedVersion && now - cachedVersionAt < VERSION_TTL_MS) {
    return cachedVersion;
  }
  try {
    const res = await fetch(`${DDRAGON_BASE}/api/versions.json`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) throw new Error(`versions.json HTTP ${res.status}`);
    const versions: string[] = await res.json();
    if (Array.isArray(versions) && versions.length > 0) {
      cachedVersion = versions[0];
      cachedVersionAt = now;
      return cachedVersion;
    }
    throw new Error('versions.json empty');
  } catch {
    cachedVersion = FALLBACK_VERSION;
    cachedVersionAt = now;
    return cachedVersion;
  }
}

// ---------------------------------------------------------------------------
// Image URL helpers (never hardcode the patch — always resolve the version)
// ---------------------------------------------------------------------------

/** Square champion icon. */
export function championIconUrl(version: string, championId: string): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${championId}.png`;
}

/** Loading-screen splash art (version-independent endpoint). */
export function championSplashUrl(championId: string): string {
  return `${DDRAGON_BASE}/cdn/img/champion/splash/${championId}_0.jpg`;
}

// ---------------------------------------------------------------------------
// Champion roster
// ---------------------------------------------------------------------------

interface DDragonChampionListResponse {
  data: Record<
    string,
    {
      id: string;
      name: string;
      title: string;
      tags: string[];
      blurb: string;
    }
  >;
}

let cachedRoster: DDragonChampion[] | null = null;

function snapshotRoster(): DDragonChampion[] {
  return CHAMPIONS_SNAPSHOT.map((c) => ({
    ...c,
    blurb: `${c.name}, ${c.title}. Live lore from Data Dragon will appear here once the CDN is reachable.`,
  }));
}

/**
 * Full champion roster (id, name, title, tags, blurb). Tries Data Dragon, then
 * falls back to the bundled snapshot. Cached for the process lifetime.
 */
export async function getRoster(): Promise<DDragonChampion[]> {
  if (cachedRoster) return cachedRoster;
  try {
    const version = await getCurrentVersion();
    const res = await fetch(
      `${DDRAGON_BASE}/cdn/${version}/data/${LOCALE}/champion.json`,
      { next: { revalidate: REVALIDATE_SECONDS } },
    );
    if (!res.ok) throw new Error(`champion.json HTTP ${res.status}`);
    const json: DDragonChampionListResponse = await res.json();
    const list = Object.values(json.data).map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      tags: c.tags,
      blurb: c.blurb,
    }));
    if (list.length === 0) throw new Error('empty champion.json');
    list.sort((a, b) => a.name.localeCompare(b.name));
    cachedRoster = list;
    return cachedRoster;
  } catch {
    cachedRoster = snapshotRoster();
    return cachedRoster;
  }
}

/** Look up a single champion by Data Dragon id. */
export async function getRosterChampion(
  championId: string,
): Promise<DDragonChampion | null> {
  const roster = await getRoster();
  return roster.find((c) => c.id === championId) ?? null;
}
