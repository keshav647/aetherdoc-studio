'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { SupabaseSyncModal, SupabaseLogo } from '@/components/common/SupabaseSyncModal';

export function LandingHeader() {
  const { documents, byokConfig } = useAppStore();
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);

  const studioDocId =
    documents.find((d) => d.status !== 'verified')?.id ||
    documents[0]?.id ||
    'doc-inv-8941';

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#07090E]/90 transition-all">
        <div className="max-w-[1680px] mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="AetherDoc Studio Logo"
              className="h-8 w-8 rounded-lg object-cover border border-white/[0.12] shadow-[0_0_14px_rgba(56,189,248,0.22)] group-hover:border-sky-400/60 transition-all"
            />
            <span className="text-sm font-semibold tracking-tight text-white font-sans">
              AetherDoc
            </span>
          </Link>

          {/* Functional Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Upload &amp; Dashboard
            </Link>
            <Link href="/documents" className="hover:text-white transition-colors">
              Documents
            </Link>
            <Link
              href={`/documents/${studioDocId}`}
              className="hover:text-white transition-colors"
            >
              Review Studio
            </Link>
            <Link href="/search" className="hover:text-white transition-colors">
              Smart Search
            </Link>
            <Link href="/settings" className="hover:text-white transition-colors">
              Settings
            </Link>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Dedicated Official Supabase Button (#3ECF8E + Lightning Bolt SVG) */}
            <button
              type="button"
              onClick={() => setIsSupabaseOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#3ECF8E]/35 bg-[#3ECF8E]/10 px-3.5 py-1.5 text-xs font-semibold text-[#3ECF8E] hover:bg-[#3ECF8E]/20 hover:border-[#3ECF8E]/60 transition-all shadow-[0_0_18px_rgba(62,207,142,0.14)]"
            >
              <SupabaseLogo className="h-3.5 w-3.5" />
              <span>
                {byokConfig.isSupabaseConnected ? 'Supabase Synced' : 'Connect Supabase'}
              </span>
            </button>

            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-1.5 rounded-full bg-white text-[#07090E] px-4 py-1.5 text-xs font-semibold hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.12)] active:scale-[0.98]"
            >
              <span>Upload Document</span>
              <span className="text-[10px] font-mono">→</span>
            </Link>
          </div>
        </div>
      </header>

      <SupabaseSyncModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />
    </>
  );
}
