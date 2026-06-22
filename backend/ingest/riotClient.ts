/**
 * Thin Riot API client (Phase 2 scaffold — requires a production key).
 * ====================================================================
 *
 * Wraps the subset of endpoints the ingestion worker needs:
 *   - summoner-v4 / account-v1  -> resolve PUUIDs for seed players
 *   - match-v5                  -> list match ids + fetch match detail
 *   - league-exp-v4             -> (optional) rank-filtered seed discovery
 *
 * All requests go through a RateLimiter and back off on HTTP 429 using the
 * server-provided Retry-After header. The API key is read from config, which
 * reads it from the RIOT_API_KEY environment variable — never hardcoded.
 *
 * NOTE: regional vs platform routing differs by endpoint. match-v5 uses the
 * regional routing value (americas/europe/asia/sea); summoner-v4 uses the
 * platform value (na1/euw1/kr/…). Both are passed explicitly below.
 */

import { RateLimiter, DEFAULT_PROD_WINDOWS, sleep } from './rateLimiter';

export interface MatchParticipant {
  puuid: string;
  teamId: number;
  championName: string;
  championId: number;
  teamPosition: string; // TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY | ''
  win: boolean;
}

export interface MatchDetail {
  matchId: string;
  queueId: number;
  gameVersion: string;
  gameCreation: number;
  gameDuration: number;
  platformId: string;
  participants: MatchParticipant[];
}

export class RiotClient {
  private limiter: RateLimiter;

  constructor(
    private apiKey: string,
    private region: string,
    limiter?: RateLimiter,
  ) {
    this.limiter = limiter ?? new RateLimiter(DEFAULT_PROD_WINDOWS);
  }

  /** Core fetch with rate limiting + 429/5xx backoff. */
  private async get<T>(url: string, attempt = 0): Promise<T> {
    await this.limiter.acquire();
    const res = await fetch(url, {
      headers: { 'X-Riot-Token': this.apiKey },
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After') ?? '1');
      this.limiter.pause(retryAfter * 1000);
      if (attempt < 5) return this.get<T>(url, attempt + 1);
      throw new Error(`Rate limited repeatedly: ${url}`);
    }

    if (res.status >= 500 && attempt < 5) {
      // Exponential backoff on transient server errors.
      await sleep(2 ** attempt * 1000);
      return this.get<T>(url, attempt + 1);
    }

    if (!res.ok) {
      throw new Error(`Riot API ${res.status} for ${url}`);
    }
    return (await res.json()) as T;
  }

  /** Resolve a PUUID from a Riot ID (gameName#tagLine) via account-v1. */
  async getPuuidByRiotId(gameName: string, tagLine: string): Promise<string> {
    const url =
      `https://${this.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/` +
      `${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const data = await this.get<{ puuid: string }>(url);
    return data.puuid;
  }

  /** List recent ranked match ids for a PUUID (match-v5). */
  async getMatchIds(
    puuid: string,
    opts: { queue?: number; start?: number; count?: number; startTime?: number } = {},
  ): Promise<string[]> {
    const params = new URLSearchParams();
    if (opts.queue != null) params.set('queue', String(opts.queue));
    params.set('start', String(opts.start ?? 0));
    params.set('count', String(opts.count ?? 100));
    if (opts.startTime != null) params.set('startTime', String(opts.startTime));
    const url =
      `https://${this.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/` +
      `${puuid}/ids?${params.toString()}`;
    return this.get<string[]>(url);
  }

  /** Fetch full detail for a single match id (match-v5). */
  async getMatch(matchId: string): Promise<MatchDetail> {
    const url = `https://${this.region}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    const raw = await this.get<RawMatchV5>(url);
    return normaliseMatch(raw);
  }
}

// ---------------------------------------------------------------------------
// Raw match-v5 shape (subset) -> normalised MatchDetail
// ---------------------------------------------------------------------------

interface RawMatchV5 {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameVersion: string;
    gameCreation: number;
    gameDuration: number;
    platformId: string;
    participants: {
      puuid: string;
      teamId: number;
      championName: string;
      championId: number;
      teamPosition: string;
      win: boolean;
    }[];
  };
}

function normaliseMatch(raw: RawMatchV5): MatchDetail {
  return {
    matchId: raw.metadata.matchId,
    queueId: raw.info.queueId,
    gameVersion: raw.info.gameVersion,
    gameCreation: raw.info.gameCreation,
    gameDuration: raw.info.gameDuration,
    platformId: raw.info.platformId,
    participants: raw.info.participants.map((p) => ({
      puuid: p.puuid,
      teamId: p.teamId,
      championName: p.championName,
      championId: p.championId,
      teamPosition: p.teamPosition,
      win: p.win,
    })),
  };
}

/** Map Riot's teamPosition to our normalised Lane string. */
export function normaliseLane(teamPosition: string): string | null {
  switch (teamPosition) {
    case 'TOP':
      return 'top';
    case 'JUNGLE':
      return 'jungle';
    case 'MIDDLE':
      return 'mid';
    case 'BOTTOM':
      return 'bot';
    case 'UTILITY':
      return 'support';
    default:
      return null; // unknown / remake — skip
  }
}

/** Extract the major.minor patch from a gameVersion like "14.12.604.1234". */
export function patchFromGameVersion(gameVersion: string): string {
  const parts = gameVersion.split('.');
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : gameVersion;
}
