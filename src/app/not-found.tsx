import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="font-display text-7xl font-bold text-ember">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-100">
        Champion not found
      </h1>
      <p className="mt-2 max-w-md text-slate-400">
        The page you&apos;re looking for has recalled to base. Head back to the
        champion index to keep browsing matchups.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-gradient-to-br from-ember to-ember-600 px-5 py-2.5 font-semibold text-abyss-900 shadow-glow transition hover:brightness-110"
      >
        Browse champions
      </Link>
    </div>
  );
}
