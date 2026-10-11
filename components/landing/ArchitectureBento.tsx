'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { LiquidGlassCard } from '@/components/common/LiquidGlassCard';
import { Layers, Lock, Database } from 'lucide-react';

export function ArchitectureBento() {
  const { documents } = useAppStore();
  const studioDocId =
    documents.find((d) => d.status !== 'verified')?.id ||
    documents[0]?.id ||
    'doc-inv-8941';

  return (
    <>
      <section className="relative py-24 px-6 sm:px-8 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono text-[11px] uppercase tracking-widest text-sky-400">
            CORE CAPABILITIES
          </p>
          <h2 className="font-editorial text-3xl sm:text-4xl text-white font-normal mt-2">
            Built for finance, legal, and operations teams.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pillar 1 */}
          <LiquidGlassCard interactive className="p-7 flex flex-col justify-between">
            <div>
              <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sky-400 mb-5">
                <Layers className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Pinpoint Page Highlighting
              </h3>
              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed font-sans">
                Every extracted value is linked directly to its exact location on the page. Click any field to jump straight to its source box at any screen size or zoom level from <code className="text-sky-300 font-mono">60%</code> to <code className="text-sky-300 font-mono">220%</code>.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono tracking-tight tabular-nums text-slate-500">
              <span>Coordinate Accuracy</span>
              <span className="text-sky-400">Exact Page Lock</span>
            </div>
          </LiquidGlassCard>

          {/* Pillar 2 */}
          <LiquidGlassCard interactive className="p-7 flex flex-col justify-between">
            <div>
              <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sky-400 mb-5">
                <Lock className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Workspace &amp; Client Isolation
              </h3>
              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed font-sans">
                Keep each client or department’s documents strictly separated. Every edit, approval, and flagged issue is recorded in a complete change history with user and timestamp tracking.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono tracking-tight tabular-nums text-slate-500">
              <span>Security Standard</span>
              <span className="text-emerald-400">Full Audit History</span>
            </div>
          </LiquidGlassCard>

          {/* Pillar 3 */}
          <LiquidGlassCard interactive className="p-7 flex flex-col justify-between">
            <div>
              <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sky-400 mb-5">
                <Database className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Instant Keyword &amp; AI Search
              </h3>
              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed font-sans">
                Search across all your invoices, contracts, and statements at once. Find exact invoice numbers, dollar totals, or legal clauses in milliseconds and open the exact page where they appear.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono tracking-tight tabular-nums text-slate-500">
              <span>Search Speed</span>
              <span className="text-sky-400">Instant Jump</span>
            </div>
          </LiquidGlassCard>
        </div>
      </section>

      {/* Conversion CTA */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <h2 className="font-editorial text-3xl sm:text-5xl text-white font-normal leading-tight">
          Verify every business document with confidence.
        </h2>
        <p className="mt-4 text-xs sm:text-sm text-slate-400 font-sans max-w-lg mx-auto leading-relaxed">
          Open the side-by-side Review Studio, upload new invoices or contracts, or search across your entire document library.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/documents/${studioDocId}`}
            className="group inline-flex items-center gap-2 rounded-full bg-white text-[#07090E] px-6 py-3 text-xs font-semibold hover:bg-slate-200 transition-all shadow-[0_0_24px_rgba(255,255,255,0.18)] active:scale-[0.98]"
          >
            <span>Open Review Studio</span>
            <span className="text-xs">→</span>
          </Link>

          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-[#0B0F19]/85 text-slate-200 hover:text-white hover:border-white/25 px-6 py-3 text-xs font-medium transition-all"
          >
            <span>Go to Overview</span>
            <span className="text-xs">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
