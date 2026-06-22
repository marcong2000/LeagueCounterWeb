import type { Metadata } from 'next';
import { SampleDataBadge } from '@/components/SampleDataBadge';
import {
  MAX_SCORE,
  MIN_GAMES,
  SCORE_SCALE,
} from '@/lib/counterScore';
import { isSampleData } from '@/lib/data';

export const metadata: Metadata = {
  title: 'About & methodology',
  description:
    'How Counterforge computes champion counter scores, where the data comes from, and the required Riot Games attribution.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-50">
        About Counterforge
      </h1>

      {isSampleData() && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-ember/30 bg-ember/5 p-4 text-sm text-slate-300">
          <SampleDataBadge />
          <span>
            This deployment shows <strong>synthetic placeholder statistics</strong>,
            not real match data. The numbers are generated deterministically so
            the site can be demonstrated before a Riot production API key is
            provisioned.
          </span>
        </div>
      )}

      <Section title="What this site does">
        <p>
          Counterforge helps League of Legends players pick into favourable
          matchups. For every champion you can browse overall win and pick
          rates, see which lanes they&apos;re played in, and open a detail page
          listing their best counters and worst matchups by lane.
        </p>
      </Section>

      <Section title="Where the data comes from">
        <p>
          Champion names, titles, class tags and images are served by{' '}
          <strong>Data Dragon</strong>, Riot&apos;s free static content CDN. No
          API key is required for that static data, and image URLs always use
          the current patch version.
        </p>
        <p className="mt-3">
          Matchup statistics are <strong>not</strong> provided by Riot. The Riot
          Match API returns only raw per-match and per-player records — it does
          not expose aggregate &ldquo;Champion X vs Champion Y&rdquo; win rates.
          Those aggregates are <strong>computed by Counterforge</strong> from
          large samples of individual matches (see the methodology below). In the
          current phase those aggregates are replaced by clearly-labelled sample
          data.
        </p>
      </Section>

      <Section title="How the counter score is calculated">
        <p>
          For an ordered pair — champion <em>A</em> in a given lane versus
          opponent <em>B</em> — we gather every sampled game where they faced off
          in that lane and compute <em>A</em>&apos;s win rate. That win rate is
          converted to a single counter score:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-abyss-600 bg-abyss-900/70 p-4 text-xs text-frost-400">
{`counterScore = clamp((winRate - 0.5) × ${SCORE_SCALE}, -${MAX_SCORE}, +${MAX_SCORE})`}
        </pre>
        <ul className="mt-4 space-y-1.5 text-sm">
          <li>• A 50% win rate maps to a neutral <strong>0</strong>.</li>
          <li>• Positive scores mean <em>A</em> counters <em>B</em>; negative means <em>A</em> is countered.</li>
          <li>
            • Matchups with fewer than <strong>{MIN_GAMES}</strong> sampled games
            are flagged low-confidence and hidden by default.
          </li>
        </ul>
        <p className="mt-3 text-sm text-slate-400">
          The same formula is used for both the sample data shown today and the
          real computed data in production, so the displayed numbers stay
          internally consistent.
        </p>
      </Section>

      <Section title="Legal & attribution">
        <p className="text-sm leading-relaxed text-slate-400">
          Counterforge isn&apos;t endorsed by Riot Games and doesn&apos;t reflect
          the views or opinions of Riot Games or anyone officially involved in
          producing or managing Riot Games properties. Riot Games and all
          associated properties are trademarks or registered trademarks of Riot
          Games, Inc.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-slate-100">{title}</h2>
      <div className="mt-2 leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}
