'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';

export function LandingFooter() {
  const { documents } = useAppStore();
  const studioDocId =
    documents.find((d) => d.status !== 'verified')?.id ||
    documents[0]?.id ||
    'doc-inv-8941';

  return (
    <footer className="border-t border-white/[0.06] bg-[#04060A]/45 backdrop-blur-md py-10 px-6 sm:px-12 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 font-serif text-sm">◈</span>
          <span className="font-semibold text-slate-300 font-sans">AetherDoc Enterprise</span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-[11px] text-slate-500">
            Document Intelligence & Audit Engine
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-[11px] text-slate-400 font-mono">
          <Link href={`/documents/${studioDocId}`} className="hover:text-white transition-colors">
            Studio
          </Link>
          <Link href="/documents" className="hover:text-white transition-colors">
            Ledger
          </Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Console
          </Link>
          <Link href="/search" className="hover:text-white transition-colors">
            Search
          </Link>
          <Link href="/settings" className="hover:text-white transition-colors">
            Settings
          </Link>
        </div>

        <div className="font-mono text-[10px] text-slate-600">
          © 2026 AetherDoc Systems. Multi-Tenant RLS Enabled.
        </div>
      </div>
    </footer>
  );
}
