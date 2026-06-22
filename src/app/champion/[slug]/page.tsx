import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MatchupExplorer } from '@/components/MatchupExplorer';
import { SampleDataBadge } from '@/components/SampleDataBadge';
import {
  getAllChampionSlugs,
  getChampion,
  getDataVersion,
  isSampleData,
} from '@/lib/data';
import { LANE_LABELS, LANES, type Lane } from '@/lib/types';
import { pct } from '@/lib/format';

export const revalidate = 86400;

export async function generateStaticParams() {
  const slugs = await getAllChampionSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const champion = await getChampion(params.slug);
  if (!champion) return { title: 'Champion not found' };
  return {
    title: `${champion.name}, ${champion.title}`,
    description: `Counter picks, matchups and win rates for ${champion.name} in League of Legends.`,
  };
}

export default async function ChampionPage({
  params,
}: {
  params: { slug: string };
}) {
  const champion = await getChampion(params.slug);
  if (!champion) notFound();

  const version = await getDataVersion();
  const availableLanes: Lane[] = LANES.filter(
    (l) => champion.laneDistribution[l] >= 0.15,
  );

  return (
    <div>
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0 h-64 overflow-hidden">
          <Image
            src={champion.splashUrl}
            alt=""
            fill
            unoptimized
            priority
            className="object-cover object-top opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-abyss-900/40 via-abyss-900/80 to-abyss-900" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-2 pt-10 sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <Image
              src={champion.iconUrl}
              alt={champion.name}
              width={96}
              height={96}
              unoptimized
              priority
              className="h-24 w-24 rounded-xl ring-2 ring-ember/50 shadow-glow"
            />
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {champion.tags.map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
                {isSampleData() && <SampleDataBadge />}
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
                {champion.name}
              </h1>
              <p className="text-slate-400">{champion.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Stat strip */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Win rate" value={pct(champion.winRate)} />
          <StatCard label="Pick rate" value={pct(champion.pickRate)} />
          <StatCard
            label="Primary lanes"
            value={availableLanes.slice(0, 2).map((l) => LANE_LABELS[l]).join(', ') || '—'}
          />
          <StatCard label="Matchups tracked" value={String(champion.matchups.length)} />
        </div>

        {champion.blurb && (
          <p className="mb-8 max-w-3xl text-sm leading-relaxed text-slate-400">
            {champion.blurb}
          </p>
        )}

        {/* Lane distribution */}
        <section className="card mb-8 p-4">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate-400">
            Lane distribution
          </h2>
          <div className="space-y-2">
            {LANES.map((l) => (
              <div key={l} className="flex items-center gap-3">
                <span className="w-16 text-sm text-slate-400">{LANE_LABELS[l]}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-abyss-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-frost-600 to-frost"
                    style={{ width: `${Math.round(champion.laneDistribution[l] * 100)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm tabular-nums text-slate-400">
                  {pct(champion.laneDistribution[l], 0)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Matchups */}
        <section className="mb-10">
          <h2 className="mb-4 font-display text-xl font-bold text-slate-100">
            Matchups
          </h2>
          <MatchupExplorer
            matchups={champion.matchups}
            availableLanes={availableLanes}
            version={version}
          />
        </section>

        {/* Tips */}
        {champion.tips.length > 0 && (
          <section className="card p-5">
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate-400">
              Matchup tips
            </h2>
            <ul className="space-y-2">
              {champion.tips.map((tip, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-300">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-slate-100">{value}</p>
    </div>
  );
}
