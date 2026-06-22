/**
 * "Sample data" badge — surfaced wherever synthetic numbers appear in Phase 1.
 * Remove (or gate behind `isSampleData()`) once the data layer reads real data.
 */
export function SampleDataBadge({ className = '' }: { className?: string }) {
  return (
    <span
      title="All statistics are synthetic placeholder data, not real match data."
      className={`inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ember-400 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse" />
      Sample data
    </span>
  );
}
