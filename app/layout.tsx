import type { Metadata } from 'next';
import './globals.css';
import { CursorGlow } from '@/components/common/CursorGlow';
import { CosmicStarfield } from '@/components/common/CosmicStarfield';

export const metadata: Metadata = {
  title: 'AetherDoc | Autonomous Document Intelligence & Signal Reconciliation',
  description:
    'The layer between raw enterprise records and real decisions — every invoice, contract, and audit trail reconciled into one graph. Hard multi-tenant RLS and precision human-in-the-loop verification.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#07090E] text-slate-100 antialiased selection:bg-sky-500/20 selection:text-sky-200">
        <CosmicStarfield />
        <CursorGlow />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
