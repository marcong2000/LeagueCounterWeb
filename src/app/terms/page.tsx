import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Placeholder Terms of Service for Counterforge.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-50">
        Terms of Service
      </h1>

      <div className="mt-4 rounded-lg border border-ember/30 bg-ember/5 p-4 text-sm text-slate-300">
        <strong>Placeholder.</strong> This is template copy. The site owner must
        replace it with their own legal Terms of Service, reviewed by counsel,
        before submitting the site for Riot production-key approval or going
        public.
      </div>

      <div className="prose-invert mt-8 space-y-6 leading-relaxed text-slate-300">
        <Clause n="1" title="Acceptance of terms">
          By accessing or using Counterforge (the &ldquo;Service&rdquo;) you
          agree to be bound by these Terms. If you do not agree, do not use the
          Service.
        </Clause>
        <Clause n="2" title="Description of service">
          The Service provides informational statistics about League of Legends
          champions and matchups. Statistics are provided on an
          &ldquo;as-is&rdquo; basis for general informational purposes only.
        </Clause>
        <Clause n="3" title="Riot Games intellectual property">
          League of Legends and all related names, marks, images and data are the
          property of Riot Games, Inc. The Service is not endorsed by or
          affiliated with Riot Games. Static champion data is used in accordance
          with Riot&apos;s developer policies.
        </Clause>
        <Clause n="4" title="No warranty">
          The Service is provided without warranties of any kind. We do not
          guarantee the accuracy, completeness, or timeliness of any statistic.
        </Clause>
        <Clause n="5" title="Limitation of liability">
          To the maximum extent permitted by law, the operators of the Service
          are not liable for any damages arising from your use of the Service.
        </Clause>
        <Clause n="6" title="Changes to these terms">
          We may update these Terms from time to time. Continued use of the
          Service after changes constitutes acceptance of the revised Terms.
        </Clause>
        <p className="text-sm text-slate-500">Last updated: placeholder date.</p>
      </div>
    </div>
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
      <p className="mt-1 text-slate-300">{children}</p>
    </section>
  );
}
