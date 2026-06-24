import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Counterforge handles data and protects your privacy.',
};

/**
 * NOTE FOR THE OWNER:
 * Substantive starter Privacy Policy tailored to Counterforge, not legal advice.
 * Before launch, fill in every highlighted blank, make the "What we collect"
 * and "Third parties" sections match what you ACTUALLY run (e.g. your real
 * host, database provider, and whether you add analytics), and have it reviewed
 * by a qualified professional. Search this file for the <Blank> markers.
 */

const EFFECTIVE_DATE = '[effective date — e.g. 24 June 2026]';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-50">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {EFFECTIVE_DATE}</p>

      <div className="mt-4 rounded-lg border border-ember/30 bg-ember/5 p-4 text-sm text-slate-300">
        <strong>Owner action required.</strong> This is starter copy, not legal
        advice. Fill in every <Blank>highlighted blank</Blank>, make each section
        match what you actually operate, and have it reviewed before launch.
      </div>

      <div className="mt-8 space-y-6 leading-relaxed text-slate-300">
        <Clause title="Summary">
          <p>
            Counterforge (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a free
            informational website about League of Legends champion matchups. We
            do <strong>not</strong> offer accounts and do <strong>not</strong>{' '}
            ask visitors for personal information. We process publicly available
            match data to compute aggregate statistics, and our hosting providers
            process limited technical data needed to serve the site securely.
          </p>
        </Clause>

        <Clause title="Information from visitors">
          <p>
            We do not require you to create an account or submit personal data to
            browse the Service. Our hosting and infrastructure providers
            automatically process limited technical information — such as IP
            address, browser/user-agent, and request timestamps — in server logs
            for security, abuse-prevention and operational purposes. This data is
            handled by those providers and retained for{' '}
            <Blank>[retention period, e.g. 30 days]</Blank>.
          </p>
        </Clause>

        <Clause title="Riot / League of Legends match data">
          <p>
            To produce matchup statistics, we retrieve publicly available data
            from Riot Games&apos; APIs — match records and in-game participant
            details. This includes pseudonymous in-game identifiers (such as{' '}
            <abbr title="Player Universally Unique Identifier">PUUIDs</abbr>),
            champions played, assigned lane, and match outcome.
          </p>
          <p>
            We use these records solely to compute and display{' '}
            <em>aggregate</em> matchup statistics. We do not build profiles of
            individual players, do not link this data to real-world identities,
            and do not display individual players&apos; match histories. Raw
            identifiers are used only internally for de-duplication and
            aggregation.
          </p>
          <p>
            This processing is carried out under{' '}
            <Blank>[your legal basis — e.g. &ldquo;legitimate interests&rdquo; under GDPR Art. 6(1)(f)]</Blank>{' '}
            and in accordance with Riot Games&apos; developer policies.
          </p>
        </Clause>

        <Clause title="Cookies & analytics">
          <p>
            The Service does not set advertising cookies. It uses only the
            cookies/local storage strictly necessary for the site to function.{' '}
            <Blank>
              [If you add analytics — e.g. Vercel Analytics, Plausible, Google
              Analytics — name it here, describe what it collects, and add any
              required consent banner.]
            </Blank>
          </p>
        </Clause>

        <Clause title="Service providers we share data with">
          <p>
            We rely on third-party processors to operate the Service. Each
            processes data only as needed to provide its service:
          </p>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>
              <strong>Hosting / CDN:</strong>{' '}
              <Blank>[e.g. Vercel]</Blank> — serves the site and keeps security
              logs.
            </li>
            <li>
              <strong>Database:</strong>{' '}
              <Blank>[e.g. Neon / Supabase / your provider]</Blank> — stores raw
              match records and the computed aggregates.
            </li>
            <li>
              <strong>Riot Games:</strong> source of the champion and match data
              described above.
            </li>
          </ul>
          <p>
            We do not sell your personal data. We may disclose data if required by
            law or to protect our rights and the security of the Service.
          </p>
        </Clause>

        <Clause title="Data retention">
          <p>
            Aggregate statistics are retained per game patch. Raw match records
            used to compute those aggregates may be pruned periodically once they
            are no longer needed, typically within{' '}
            <Blank>[retention period, e.g. 90 days]</Blank>.
          </p>
        </Clause>

        <Clause title="International transfers">
          <p>
            Our providers may process data in countries other than yours. Where
            required, transfers are protected by appropriate safeguards such as
            Standard Contractual Clauses. <Blank>[Confirm with your providers.]</Blank>
          </p>
        </Clause>

        <Clause title="Your rights">
          <p>
            Depending on where you live (for example under the GDPR or CCPA), you
            may have rights to access, correct, delete, or restrict the processing
            of personal data, and to object to certain processing. Because we hold
            only pseudonymous in-game identifiers and cannot link them to your
            real identity, we may be unable to locate data about a specific person
            without additional information. To make a request, contact us at{' '}
            <Blank>[your contact email]</Blank>.
          </p>
        </Clause>

        <Clause title="Children">
          <p>
            The Service is not directed to children under 13 (or the minimum age
            of digital consent in your country), and we do not knowingly collect
            personal data from them.
          </p>
        </Clause>

        <Clause title="Security">
          <p>
            We take reasonable technical and organisational measures to protect
            data, including transport encryption (HTTPS) and keeping API
            credentials server-side only. No method of transmission or storage is
            completely secure, however, and we cannot guarantee absolute security.
          </p>
        </Clause>

        <Clause title="Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. Material changes
            will be reflected by updating the &ldquo;Last updated&rdquo; date
            above.
          </p>
        </Clause>

        <Clause title="Contact">
          <p>
            Questions about this policy or your data can be sent to{' '}
            <Blank>[your contact email]</Blank>
            {', '}
            <Blank>[and postal address if required in your jurisdiction]</Blank>.
          </p>
        </Clause>
      </div>
    </div>
  );
}

/** Highlights a value the owner must replace before launch. */
function Blank({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-ember/15 px-1 font-medium text-ember-400">
      {children}
    </span>
  );
}

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-slate-100">{title}</h2>
      <div className="mt-1 space-y-2 text-slate-300">{children}</div>
    </section>
  );
}
