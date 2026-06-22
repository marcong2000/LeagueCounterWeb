import { ChampionExplorer } from '@/components/ChampionExplorer';
import { SampleDataBadge } from '@/components/SampleDataBadge';
import { getAllChampions, isSampleData } from '@/lib/data';

// Champion data is static per patch; revalidate daily.
export const revalidate = 86400;

export default async function HomePage() {
  const champions = await getAllChampions();
  const sample = await isSampleData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            Champion counter stats
          </h1>
          {sample && <SampleDataBadge />}
        </div>
        <p className="mt-3 max-w-2xl text-slate-400">
          Win rates, pick rates, lane splits and matchup counter scores for all{' '}
          {champions.length} champions. Sort by performance, filter by lane, or
          search by name, then open a champion to see their best and worst
          matchups.
        </p>
      </section>

      <ChampionExplorer champions={champions} />
    </div>
  );
}
