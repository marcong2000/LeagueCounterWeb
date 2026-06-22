/**
 * Unit tests for the Riot client + rate limiter (node:test, mocked fetch).
 * ============================================================================
 *
 * These cover the one part of Phase 2 that cannot be run live in CI / sandboxes
 * (the actual Riot HTTP calls), by stubbing global `fetch`: routing/URL
 * construction, 429 Retry-After backoff, 5xx exponential backoff, and the pure
 * helpers (lane normalisation, patch parsing).
 *
 * Run with:  npm run test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RiotClient,
  normaliseLane,
  patchFromGameVersion,
} from './riotClient';
import { RateLimiter } from './rateLimiter';

type FetchArgs = { url: string; headers: Record<string, string> };

/** Install a fake global fetch that replays a queue of responses. */
function mockFetch(
  responses: { status: number; body?: unknown; headers?: Record<string, string> }[],
): { calls: FetchArgs[]; restore: () => void } {
  const calls: FetchArgs[] = [];
  const original = globalThis.fetch;
  let i = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: (init?.headers as Record<string, string>) ?? {},
    });
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: { get: (k: string) => r.headers?.[k.toLowerCase()] ?? r.headers?.[k] ?? null },
      json: async () => r.body,
    } as unknown as Response;
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

/** A limiter with no real delay so tests stay fast. */
function instantLimiter(): RateLimiter {
  return new RateLimiter([{ limit: 1000, intervalMs: 1 }]);
}

test('normaliseLane maps Riot positions to our lanes', () => {
  assert.equal(normaliseLane('TOP'), 'top');
  assert.equal(normaliseLane('JUNGLE'), 'jungle');
  assert.equal(normaliseLane('MIDDLE'), 'mid');
  assert.equal(normaliseLane('BOTTOM'), 'bot');
  assert.equal(normaliseLane('UTILITY'), 'support');
  assert.equal(normaliseLane(''), null);
  assert.equal(normaliseLane('AFK'), null);
});

test('patchFromGameVersion extracts major.minor', () => {
  assert.equal(patchFromGameVersion('14.12.604.1234'), '14.12');
  assert.equal(patchFromGameVersion('13.1.1'), '13.1');
  assert.equal(patchFromGameVersion('weird'), 'weird');
});

test('match-v5 uses REGIONAL routing and sends the API key header', async () => {
  const { calls, restore } = mockFetch([{ status: 200, body: ['EUW1_1', 'EUW1_2'] }]);
  try {
    const riot = new RiotClient('KEY123', 'europe', 'euw1', instantLimiter());
    const ids = await riot.getMatchIds('PUUID', { queue: 420, count: 2 });
    assert.deepEqual(ids, ['EUW1_1', 'EUW1_2']);
    assert.match(calls[0].url, /^https:\/\/europe\.api\.riotgames\.com\/lol\/match\/v5\//);
    assert.match(calls[0].url, /queue=420/);
    assert.match(calls[0].url, /count=2/);
    assert.equal(calls[0].headers['X-Riot-Token'], 'KEY123');
  } finally {
    restore();
  }
});

test('league-v4 uses PLATFORM routing', async () => {
  const { calls, restore } = mockFetch([
    { status: 200, body: { entries: [{ puuid: 'A' }, { summonerId: 'S1' }] } },
  ]);
  try {
    const riot = new RiotClient('KEY', 'europe', 'euw1', instantLimiter());
    const entries = await riot.getApexLeague('challenger');
    assert.equal(entries.length, 2);
    assert.match(
      calls[0].url,
      /^https:\/\/euw1\.api\.riotgames\.com\/lol\/league\/v4\/challengerleagues\//,
    );
  } finally {
    restore();
  }
});

test('429 triggers a Retry-After pause then a retry', async () => {
  const { calls, restore } = mockFetch([
    { status: 429, headers: { 'retry-after': '0' } },
    { status: 200, body: { puuid: 'OK' } },
  ]);
  try {
    const riot = new RiotClient('KEY', 'americas', 'na1', instantLimiter());
    const puuid = await riot.getPuuidBySummonerId('SUMMONER');
    assert.equal(puuid, 'OK');
    assert.equal(calls.length, 2); // first 429, then success
  } finally {
    restore();
  }
});

test('5xx is retried with backoff and eventually succeeds', async () => {
  const { calls, restore } = mockFetch([
    { status: 503 },
    { status: 200, body: { puuid: 'RECOVERED' } },
  ]);
  try {
    // Patch sleep indirectly by using tiny backoff: attempt 0 => 1s. To keep the
    // test fast we accept the single 1s wait; node:test default timeout is 30s.
    const riot = new RiotClient('KEY', 'americas', 'na1', instantLimiter());
    const puuid = await riot.getPuuidBySummonerId('S');
    assert.equal(puuid, 'RECOVERED');
    assert.equal(calls.length, 2);
  } finally {
    restore();
  }
});

test('RateLimiter blocks past its window limit', async () => {
  const limiter = new RateLimiter([{ limit: 2, intervalMs: 50 }]);
  const start = Date.now();
  await limiter.acquire();
  await limiter.acquire();
  await limiter.acquire(); // third must wait for the window to roll
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 40, `expected throttling delay, got ${elapsed}ms`);
});
