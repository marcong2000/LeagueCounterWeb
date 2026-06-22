'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LANE_LABELS, type Lane, type Matchup } from '@/lib/types';
import { championIconUrl } from '@/lib/ddragon';
import { counterScoreLabel } from '@/lib/counterScore';
import { compactGames, pct, signedScore } from '@/lib/format';

export function MatchupExplorer({
  matchups,
  availableLanes,
  version,
}: {
  matchups: Matchup[];
  availableLanes: Lane[];
  version: string;
}) {
  const [lane, setLane] = useState<Lane | 'all'>(
    availableLanes[0] ?? 'all',
  );
  const [includeLowConfidence, setIncludeLowConfidence] = useState(false);

  const inLane = useMemo(() => {
    let list = lane === 'all' ? matchups : matchups.filter((m) => m.lane === lane);
    if (!includeLowConfidence) list = list.filter((m) => !m.lowConfidence);
    return list;
  }, [matchups, lane, includeLowConfidence]);

  const best = useMemo(
    () => [...inLane].sort((a, b) => b.counterScore - a.counterScore).slice(0, 8),
    [inLane],
  );
  const worst = useMemo(
    () => [...inLane].sort((a, b) => a.counterScore - b.counterScore).slice(0, 8),
    [inLane],
  );

  const hiddenLowConf =
    !includeLowConfidence &&
    (lane === 'all'
      ? matchups
      : matchups.filter((m) => m.lane === lane)
    ).filter((m) => m.lowConfidence).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-slate-500">Lane</span>
          {availableLanes.length > 1 && (
            <LaneChip active={lane === 'all'} onClick={() => setLane('all')}>
              All
            </LaneChip>
          )}
          {availableLanes.map((l) => (
            <LaneChip key={l} active={lane === l} onClick={() => setLane(l)}>
              {LANE_LABELS[l]}
            </LaneChip>
          ))}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={includeLowConfidence}
            onChange={(e) => setIncludeLowConfidence(e.target.checked)}
            className="h-3.5 w-3.5 accent-ember"
          />
          Show low-confidence{hiddenLowConf ? ` (${hiddenLowConf})` : ''}
        </label>
      </div>

      {inLane.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <p className="font-medium text-slate-300">Not enough data yet</p>
          <p className="mt-1 text-sm">
            No matchups meet the confidence threshold for this lane. Try enabling
            low-confidence results above.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <MatchupColumn
            title="Best counters"
            accent="frost"
            subtitle="Opponents this champion beats most often"
            matchups={best}
            version={version}
          />
          <MatchupColumn
            title="Worst matchups"
            accent="rose"
            subtitle="Opponents that counter this champion"
            matchups={worst}
            version={version}
          />
        </div>
      )}
    </div>
  );
}

function MatchupColumn({
  title,
  subtitle,
  accent,
  matchups,
  version,
}: {
  title: string;
  subtitle: string;
  accent: 'frost' | 'rose';
  matchups: Matchup[];
  version: string;
}) {
  const dot = accent === 'frost' ? 'bg-frost' : 'bg-rose';
  return (
    <section className="card overflow-hidden">
      <header className="border-b border-abyss-600/60 px-4 py-3">
        <h3 className="flex items-center gap-2 font-display font-semibold text-slate-100">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </header>
      <ul>
        {matchups.map((m) => (
          <li
            key={`${m.opponentId}-${m.lane}`}
            className="flex items-center gap-3 border-b border-abyss-700/40 px-4 py-2.5 last:border-0"
          >
            <Link href={`/champion/${m.opponentId}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Image
                src={championIconUrl(version, m.opponentId)}
                alt={m.opponentName}
                width={32}
                height={32}
                loading="lazy"
                unoptimized
                className="h-8 w-8 rounded-md ring-1 ring-abyss-500/60"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-100">
                  {m.opponentName}
                </span>
                <span className="block text-xs text-slate-500">
                  {LANE_LABELS[m.lane]} · {compactGames(m.games)} games
                  {m.lowConfidence && (
                    <span className="ml-1 text-ember-400">· low conf.</span>
                  )}
                </span>
              </span>
            </Link>
            <div className="text-right">
              <p
                className={`tabular-nums font-semibold ${
                  m.counterScore >= 0 ? 'text-frost-400' : 'text-rose'
                }`}
              >
                {signedScore(m.counterScore)}
              </p>
              <p className="text-xs text-slate-500">
                {pct(m.winRate)} · {counterScoreLabel(m.counterScore)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
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
