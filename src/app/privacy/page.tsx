import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Placeholder Privacy Policy for Counterforge.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-50">
        Privacy Policy
      </h1>

      <div className="mt-4 rounded-lg border border-ember/30 bg-ember/5 p-4 text-sm text-slate-300">
        <strong>Placeholder.</strong> This is template copy. The site owner must
        replace it with a real Privacy Policy that accurately reflects what data
        is collected and how it is used, before going public or submitting for
        Riot production-key approval.
      </div>

      <div className="mt-8 space-y-6 leading-relaxed text-slate-300">
        <Clause title="Information we collect">
          The Phase 1 site does not require accounts and does not ask you for
          personal information. Standard server logs (such as IP address and
          user agent) may be recorded by the hosting provider for security and
          operational purposes.
        </Clause>
        <Clause title="Riot account data">
          When real-data ingestion is enabled, the Service processes publicly
          available match data retrieved from the Riot Games API. It associates
          matches with anonymised in-game identifiers (PUUIDs) solely to compute
          aggregate statistics. It does not link this data to real-world
          identities.
        </Clause>
        <Clause title="Cookies & analytics">
          This template does not set advertising cookies. If analytics are added
          later, this section must be updated to describe them and to provide any
          required consent mechanism.
        </Clause>
        <Clause title="Data retention">
          Aggregate statistics are retained per patch. Raw match records used to
          compute aggregates may be pruned periodically.
        </Clause>
        <Clause title="Contact">
          Questions about this policy should be directed to the contact address
          the owner provides before launch.
        </Clause>
        <p className="text-sm text-slate-500">Last updated: placeholder date.</p>
      </div>
    </div>
  );
}

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-slate-100">{title}</h2>
      <p className="mt-1 text-slate-300">{children}</p>
    </section>
  );
}
