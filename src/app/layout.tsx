import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getDataVersion } from '@/lib/data';

export const metadata: Metadata = {
  title: {
    default: 'Counterforge — LoL Champion Counter Stats',
    template: '%s — Counterforge',
  },
  description:
    'Browse League of Legends champion win rates, pick rates, lane splits and matchup counter scores. Find the best and worst counters for every champion.',
  metadataBase: new URL('https://counterforge.example'),
  openGraph: {
    title: 'Counterforge — LoL Champion Counter Stats',
    description:
      'Champion win rates, lane splits and matchup counter scores for League of Legends.',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const version = await getDataVersion();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer version={version} />
      </body>
    </html>
  );
}
