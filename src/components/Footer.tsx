import Link from 'next/link';

/**
 * Footer with Riot's required "not endorsed by Riot Games" attribution.
 * This disclaimer is mandatory for Riot production-key approval.
 */
export function Footer({ version }: { version?: string }) {
  return (
    <footer className="mt-16 border-t border-abyss-600/60 bg-abyss-900/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p className="font-display text-base font-bold text-slate-100">
              Counter<span className="text-ember">forge</span>
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Champion counter-pick statistics for League of Legends. Browse win
              rates, lane splits and matchup counter scores.
            </p>
          </div>

          <nav className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Site
            </span>
            <Link href="/" className="text-slate-400 hover:text-slate-200">
              Champions
            </Link>
            <Link href="/about" className="text-slate-400 hover:text-slate-200">
              About &amp; methodology
            </Link>
            <Link href="/terms" className="text-slate-400 hover:text-slate-200">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-slate-400 hover:text-slate-200">
              Privacy Policy
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-abyss-700/60 pt-6 text-xs leading-relaxed text-slate-500">
          <p>
            Counterforge isn&apos;t endorsed by Riot Games and doesn&apos;t
            reflect the views or opinions of Riot Games or anyone officially
            involved in producing or managing Riot Games properties. Riot Games
            and all associated properties are trademarks or registered
            trademarks of Riot Games, Inc.
          </p>
          <p className="mt-3">
            Champion names and images are provided by Riot&apos;s Data Dragon
            service{version ? ` (patch ${version})` : ''}. © {new Date().getFullYear()} Counterforge.
          </p>
        </div>
      </div>
    </footer>
  );
}
