import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service governing use of the Counterforge website.',
};

/**
 * NOTE FOR THE OWNER:
 * This is a substantive starter Terms of Service tailored to Counterforge, not
 * legal advice. Before launch you must (1) fill in every highlighted blank
 * (operator name, jurisdiction, contact email, effective date) and (2) have it
 * reviewed by a qualified lawyer for your jurisdiction. Search this file for the
 * <Blank> markers.
 */

const EFFECTIVE_DATE = '[effective date — e.g. 24 June 2026]';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-50">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {EFFECTIVE_DATE}</p>

      <div className="mt-4 rounded-lg border border-ember/30 bg-ember/5 p-4 text-sm text-slate-300">
        <strong>Owner action required.</strong> This is starter copy, not legal
        advice. Fill in every <Blank>highlighted blank</Blank> and have a lawyer
        review it for your jurisdiction before launch.
      </div>

      <div className="mt-8 space-y-6 leading-relaxed text-slate-300">
        <Clause n="1" title="Who we are & acceptance of these terms">
          <p>
            Counterforge (the &ldquo;Service&rdquo;) is a free, informational
            website operated by <Blank>[operator / legal entity name]</Blank>{' '}
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). By accessing
            or using the Service you agree to these Terms of Service
            (&ldquo;Terms&rdquo;) and to our{' '}
            <a href="/privacy" className="text-frost-400 hover:underline">
              Privacy Policy
            </a>
            . If you do not agree, do not use the Service.
          </p>
        </Clause>

        <Clause n="2" title="Eligibility">
          <p>
            You must be at least 13 years old (or the minimum age of digital
            consent in your country, if higher) to use the Service. By using it
            you represent that you meet this requirement.
          </p>
        </Clause>

        <Clause n="3" title="What the Service provides">
          <p>
            The Service displays informational statistics about League of Legends
            champions and matchups — win rates, pick rates, lane distributions
            and a derived &ldquo;counter score&rdquo; — together with champion
            names and images. These figures are aggregate estimates computed from
            samples of public match data and are provided for general
            informational and entertainment purposes only.
          </p>
          <p>
            Some deployments display clearly-labelled <em>sample</em> (synthetic)
            data rather than live statistics. Where the &ldquo;Sample data&rdquo;
            badge is shown, the numbers are illustrative and do not represent real
            match outcomes.
          </p>
        </Clause>

        <Clause n="4" title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>
              scrape, harvest, or bulk-download the Service&apos;s content except
              as permitted by law or with our written consent;
            </li>
            <li>
              attempt to disrupt, overload, reverse-engineer, or gain
              unauthorised access to the Service or its infrastructure;
            </li>
            <li>
              use the Service to violate any law or any policy of Riot Games; or
            </li>
            <li>
              misrepresent the data (for example, presenting sample data as
              official statistics).
            </li>
          </ul>
        </Clause>

        <Clause n="5" title="Riot Games intellectual property & disclaimer">
          <p>
            League of Legends and all associated names, marks, logos, images and
            game data are trademarks or copyrighted works of Riot Games, Inc.
            Champion names and images are provided through Riot&apos;s Data Dragon
            service, and statistics are derived from data made available through
            Riot&apos;s APIs, used in accordance with Riot&apos;s developer
            policies and terms.
          </p>
          <p>
            Counterforge isn&apos;t endorsed by Riot Games and doesn&apos;t
            reflect the views or opinions of Riot Games or anyone officially
            involved in producing or managing Riot Games properties.
          </p>
        </Clause>

        <Clause n="6" title="Our intellectual property">
          <p>
            Excluding Riot Games materials and other third-party content, the
            Service&apos;s original design, code, text and the counter-score
            methodology are owned by us. You may view and share links to the
            Service for personal, non-commercial use; all other rights are
            reserved.
          </p>
        </Clause>

        <Clause n="7" title="Third-party services & links">
          <p>
            The Service relies on third-party providers (for example, hosting,
            database and content-delivery providers) and may link to third-party
            sites. We are not responsible for the content, policies, or
            availability of third parties.
          </p>
        </Clause>

        <Clause n="8" title="No warranty">
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo;, without warranties of any kind, express or implied,
            including accuracy, completeness, timeliness, merchantability, or
            fitness for a particular purpose. Statistics may be incomplete,
            delayed, or wrong, and should not be relied upon as professional
            advice.
          </p>
        </Clause>

        <Clause n="9" title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, we will not be liable for any
            indirect, incidental, special, consequential, or punitive damages, or
            any loss of data, profits, or goodwill, arising from your use of (or
            inability to use) the Service. Our total liability for any claim
            relating to the Service will not exceed{' '}
            <Blank>[e.g. USD 100, or the amount you paid us, which is normally £0]</Blank>
            .
          </p>
        </Clause>

        <Clause n="10" title="Indemnification">
          <p>
            You agree to indemnify and hold us harmless from any claims, damages,
            or expenses arising out of your misuse of the Service or your breach
            of these Terms.
          </p>
        </Clause>

        <Clause n="11" title="Changes to the Service or these Terms">
          <p>
            We may modify or discontinue the Service, and may update these Terms,
            at any time. Material changes will be reflected by updating the
            &ldquo;Last updated&rdquo; date above. Continued use after changes
            take effect constitutes acceptance of the revised Terms.
          </p>
        </Clause>

        <Clause n="12" title="Governing law">
          <p>
            These Terms are governed by the laws of{' '}
            <Blank>[your governing jurisdiction]</Blank>, without regard to its
            conflict-of-laws rules, and disputes will be subject to the courts of
            that jurisdiction.
          </p>
        </Clause>

        <Clause n="13" title="Contact">
          <p>
            Questions about these Terms can be sent to{' '}
            <Blank>[your contact email]</Blank>.
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

function Clause({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-slate-100">
        {n}. {title}
      </h2>
      <div className="mt-1 space-y-2 text-slate-300">{children}</div>
    </section>
  );
}
