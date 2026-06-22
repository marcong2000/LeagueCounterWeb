'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  LANE_LABELS,
  LANES,
  type ChampionSummary,
  type Lane,
} from '@/lib/types';
import { pct, signedScore } from '@/lib/format';

type SortKey = 'name' | 'winRate' | 'pickRate';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'winRate', label: 'Win rate' },
  { key: 'pickRate', label: 'Pick rate' },
  { key: 'name', label: 'Name' },
];

function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-slate-500';
  if (score >= 5) return 'text-frost-400';
  if (score <= -5) return 'text-rose';
  return 'text-slate-300';
}

export function ChampionExplorer({
  champions,
}: {
  champions: ChampionSummary[];
}) {
  const [query, setQuery] = useState('');
  const [lane, setLane] = useState<Lane | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('winRate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = champions.filter((c) => {
      const matchesName = q === '' || c.name.toLowerCase().includes(q);
      const matchesLane =
        lane === 'all' || c.laneDistribution[lane] >= 0.15;
      return matchesName && matchesLane;
    });

    list = [...list].sort((a, b) => {
      let cmp: number;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [champions, query, lane, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  return (
    <div>
      {/* Controls */}
      <div className="card mb-6 flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              fill="none"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search champions…"
              aria-label="Search champions by name"
              className="focus-ring w-full rounded-lg border border-abyss-600 bg-abyss-900/70 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="mr-1 text-slate-500">Sort</span>
            {SORT_OPTIONS.map((opt) => {
              const active = sortKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleSort(opt.key)}
                  className={`focus-ring rounded-md px-2.5 py-1.5 font-medium transition ${
                    active
                      ? 'bg-ember/15 text-ember-400'
                      : 'text-slate-400 hover:bg-abyss-700/70 hover:text-slate-200'
                  }`}
                  aria-pressed={active}
                >
                  {opt.label}
                  {active && (
                    <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lane filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-slate-500">Lane</span>
          <LaneChip active={lane === 'all'} onClick={() => setLane('all')}>
            All
          </LaneChip>
          {LANES.map((l) => (
            <LaneChip key={l} active={lane === l} onClick={() => setLane(l)}>
              {LANE_LABELS[l]}
            </LaneChip>
          ))}
        </div>
      </div>

      <p className="mb-3 text-sm text-slate-400">
        {filtered.length} champion{filtered.length === 1 ? '' : 's'}
        {lane !== 'all' ? ` in ${LANE_LABELS[lane]}` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          No champions match your filters.
        </div>
      ) : (
        <>
          {/* Wide screens: table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-abyss-600/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Champion</th>
                  <th className="px-4 py-3 font-semibold">
                    <button onClick={() => toggleSort('winRate')} className="hover:text-slate-200">
                      Win&nbsp;%
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    <button onClick={() => toggleSort('pickRate')} className="hover:text-slate-200">
                      Pick&nbsp;%
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Top lanes</th>
                  <th className="px-4 py-3 font-semibold">Best counter</th>
                  <th className="px-4 py-3 font-semibold">Worst matchup</th>
                  <th className="px-4 py-3 text-right font-semibold">Tips</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="group border-b border-abyss-700/40 transition last:border-0 hover:bg-abyss-700/30"
                  >
                    <td className="px-4 py-2.5">
                      <Link href={`/champion/${c.id}`} className="flex items-center gap-3">
                        <ChampionIcon url={c.iconUrl} name={c.name} />
                        <span>
                          <span className="font-medium text-slate-100 group-hover:text-ember-400">
                            {c.name}
                          </span>
                          <span className="block text-xs text-slate-500">{c.tags.join(' · ')}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-200">{pct(c.winRate)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-400">{pct(c.pickRate)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {c.primaryLanes.slice(0, 2).map((l) => (
                          <span key={l} className="chip">{LANE_LABELS[l]}</span>
                        ))}
                      </div>
                    </td>
                    <td className={`px-4 py-2.5 ${scoreColor(c.bestCounter?.counterScore)}`}>
                      {c.bestCounter ? (
                        <span>
                          {c.bestCounter.opponentName}{' '}
                          <span className="tabular-nums">({signedScore(c.bestCounter.counterScore)})</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`px-4 py-2.5 ${scoreColor(c.worstCounter?.counterScore)}`}>
                      {c.worstCounter ? (
                        <span>
                          {c.worstCounter.opponentName}{' '}
                          <span className="tabular-nums">({signedScore(c.worstCounter.counterScore)})</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">{c.tipCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Small screens: cards */}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link href={`/champion/${c.id}`} className="card block p-4 transition hover:border-ember/40">
                  <div className="flex items-center gap-3">
                    <ChampionIcon url={c.iconUrl} name={c.name} />
                    <div>
                      <p className="font-medium text-slate-100">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.tags.join(' · ')}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Stat label="Win %" value={pct(c.winRate)} />
                    <Stat label="Pick %" value={pct(c.pickRate)} />
                    <Stat
                      label="Best counter"
                      value={c.bestCounter?.opponentName ?? '—'}
                      valueClass={scoreColor(c.bestCounter?.counterScore)}
                    />
                    <Stat
                      label="Worst"
                      value={c.worstCounter?.opponentName ?? '—'}
                      valueClass={scoreColor(c.worstCounter?.counterScore)}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LaneChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-frost/50 bg-frost/15 text-frost-400'
          : 'border-abyss-500/60 bg-abyss-700/50 text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function ChampionIcon({ url, name }: { url: string; name: string }) {
  return (
    <Image
      src={url}
      alt={name}
      width={36}
      height={36}
      loading="lazy"
      className="h-9 w-9 rounded-md ring-1 ring-abyss-500/60"
      unoptimized
    />
  );
}

function Stat({
  label,
  value,
  valueClass = 'text-slate-200',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`truncate font-medium tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}
