'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { SupabaseSyncModal, SupabaseLogo } from '@/components/common/SupabaseSyncModal';

export function LandingHeader() {
  const { documents, chunks, byokConfig } = useAppStore();
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);

  const studioDocId =
    documents.find((d) => d.status !== 'verified')?.id ||
    documents[0]?.id ||
    'doc-inv-8941';

  const navPages = [
    {
      id: 'overview',
      label: 'Overview',
      sub: '3D Signal Hub',
      href: '/',
      isActive: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      id: 'dashboard',
      label: 'Upload & Dashboard',
      sub: 'Ingestion & Telemetry Console',
      href: '/dashboard',
      isActive: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
    {
      id: 'documents',
      label: 'Documents',
      sub: 'Multi-Tenant Ledger',
      href: '/documents',
      isActive: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: 'studio',
      label: 'Review Studio',
      sub: 'Bounding-Box Verification',
      href: `/documents/${studioDocId}`,
      isActive: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
          <rect x="2" y="3" width="6" height="6" rx="1" />
          <rect x="16" y="3" width="6" height="6" rx="1" />
          <rect x="9" y="15" width="6" height="6" rx="1" />
          <path d="M5 9v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
          <line x1="12" y1="13" x2="12" y2="15" />
        </svg>
      ),
    },
    {
      id: 'search',
      label: 'Smart Search',
      sub: 'Hybrid RAG Workbench',
      href: '/search',
      isActive: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      sub: 'BYOK Vault & Thresholds',
      href: '/settings',
      isActive: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-50 px-3 sm:px-6 pt-3 pb-1 pointer-events-none">
        <header className="pointer-events-auto max-w-[1520px] mx-auto px-3 py-2 rounded-full bg-[#0d0d14]/85 backdrop-blur-2xl border border-white/[0.11] shadow-[0_24px_60px_rgba(0,0,0,0.75),0_0_0_4px_rgba(255,255,255,0.025),inset_0_1px_0_rgba(255,255,255,0.18)] flex items-center justify-between gap-3">
          {/* Brand Identity Pill */}
          <Link
            href="/"
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full hover:bg-white/[0.04] transition-all shrink-0 group"
          >
            <img
              src="/logo.png"
              alt="AetherDoc Studio Logo"
              className="w-8 h-8 rounded-full object-cover border border-white/15 shadow-[0_0_20px_rgba(99,102,241,0.45)] group-hover:scale-105 transition-transform"
            />
            <div className="leading-none">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-extrabold tracking-tight text-white"
                  style={{ fontFamily: "'Syne', 'Outfit', sans-serif" }}
                >
                  AetherDoc
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  2.4
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5 hidden sm:block">
                3D Signal Hub
              </div>
            </div>
          </Link>

          {/* Floating Island Pill Navigation */}
          <nav
            className="hidden md:flex items-center gap-1 overflow-x-auto py-0.5 px-1 rounded-full bg-black/40 border border-white/[0.06] no-scrollbar"
            aria-label="Primary Navigation"
          >
            {navPages.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                title={`${p.label} — ${p.sub}`}
                className={`group relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all shrink-0 ${
                  p.isActive
                    ? 'bg-white text-[#070709] font-bold shadow-[0_4px_20px_rgba(255,255,255,0.28)]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] font-medium'
                }`}
              >
                <span
                  className={
                    p.isActive
                      ? 'text-indigo-600'
                      : 'text-zinc-500 group-hover:text-zinc-300'
                  }
                >
                  {p.icon}
                </span>
                <span>{p.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right Action & Live System Telemetry Pills */}
          <div className="flex items-center gap-2 pr-1 shrink-0">
            <Link
              href="/documents"
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-medium text-zinc-200 transition-colors"
              title="Indexed Enterprise Corpus"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>
                {documents.length} Docs · {chunks.length} Chunks
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setIsSupabaseOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#3ECF8E]/35 bg-[#3ECF8E]/10 text-[11px] font-semibold text-[#3ECF8E] hover:bg-[#3ECF8E]/20 hover:border-[#3ECF8E]/60 transition-colors cursor-pointer"
              title="Connect or Sync with Supabase PostgreSQL"
            >
              <SupabaseLogo className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {byokConfig.isSupabaseConnected ? 'Supabase Synced' : 'Connect Supabase'}
              </span>
            </button>

            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-[11px] font-semibold text-indigo-200 transition-colors"
              title="Upload & Ingest Enterprise Documents"
            >
              <span>Upload Document</span>
              <span className="text-[10px] font-mono">→</span>
            </Link>
          </div>
        </header>
      </div>

      <SupabaseSyncModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />
    </>
  );
}

