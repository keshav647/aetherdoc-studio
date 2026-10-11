'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { Search, KeyRound, Upload, Cloud } from 'lucide-react';
import { SupabaseLogo } from '@/components/common/SupabaseSyncModal';
import { CLOUD_PROVIDERS } from '@/components/common/CloudStorageModal';

interface GlobalHeaderProps {
  onOpenCommand: () => void;
  onOpenByok: () => void;
  onOpenSupabase: () => void;
  onOpenCloudStorage?: () => void;
}

export function GlobalHeader({
  onOpenCommand,
  onOpenByok,
  onOpenSupabase,
  onOpenCloudStorage,
}: GlobalHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { documents, telemetry, byokConfig, setCloudStorageModalOpen } = useAppStore();

  const pendingDocs = documents.filter((d) => d.status !== 'verified');
  const nextPendingDocId = pendingDocs[0]?.id || documents[0]?.id || 'doc-inv-8941';

  const connectedCloudMeta =
    CLOUD_PROVIDERS.find((p) => p.id === byokConfig.cloudStorage?.provider) ||
    CLOUD_PROVIDERS[0];

  const getSectionTitle = () => {
    if (pathname.startsWith('/documents/')) return 'Review Studio';
    if (pathname === '/documents') return 'Documents';
    if (pathname === '/search') return 'Smart Search';
    if (pathname === '/settings') return 'Settings';
    return 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 min-w-0 max-w-full items-center justify-between gap-3 border-b border-white/[0.06] bg-[#07090E]/92 px-4 md:px-6 overflow-hidden">
      {/* Left: Section Context + Quick Command Trigger */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="hidden lg:inline-block font-mono text-xs text-slate-300 border-r border-white/[0.08] pr-3 shrink-0">
          {getSectionTitle()}
        </span>

        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-xs text-slate-400 hover:border-white/15 hover:bg-white/[0.045] hover:text-white transition-all w-full max-w-[240px] min-w-0"
        >
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Search documents or fields...</span>
          <kbd className="ml-auto rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-slate-400 shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Upload + Cloud Storage (R2/S3/Azure) + Supabase + AI Key + Review Queue */}
      <div className="flex items-center gap-2 shrink-0">
        {pathname !== '/dashboard' && (
          <button
            onClick={() => router.push('/dashboard')}
            className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20 hover:text-white transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Document</span>
          </button>
        )}

        {/* Universal Cloud Object Storage Button (Cloudflare R2, AWS S3, Azure Blob, GCS) */}
        <button
          onClick={() => {
            if (onOpenCloudStorage) onOpenCloudStorage();
            else setCloudStorageModalOpen(true);
          }}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            byokConfig.cloudStorage?.isConnected
              ? connectedCloudMeta.badgeColor
              : 'border-orange-400/35 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:border-orange-400/60 shadow-[0_0_16px_rgba(249,115,22,0.12)]'
          }`}
          title="Connect Cloudflare R2, AWS S3, Azure Blob, or Google Cloud Storage & Search Remote Files"
        >
          <Cloud
            className={`h-3.5 w-3.5 shrink-0 ${
              byokConfig.cloudStorage?.isConnected
                ? connectedCloudMeta.accentTextClass
                : 'text-orange-400'
            }`}
          />
          <span className="hidden sm:inline">
            {byokConfig.cloudStorage?.isConnected
              ? `${connectedCloudMeta.shortName} Synced`
              : 'Connect Cloud Storage'}
          </span>
        </button>

        {/* Standalone Official Supabase Button (#3ECF8E + Lightning Bolt SVG) */}
        <button
          onClick={onOpenSupabase}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#3ECF8E]/35 bg-[#3ECF8E]/10 px-3 py-1.5 text-xs font-semibold text-[#3ECF8E] hover:bg-[#3ECF8E]/20 hover:border-[#3ECF8E]/60 transition-colors shadow-[0_0_16px_rgba(62,207,142,0.12)]"
          title="Connect or Sync with Supabase PostgreSQL"
        >
          <SupabaseLogo className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">
            {byokConfig.isSupabaseConnected ? 'Supabase Synced' : 'Connect Supabase'}
          </span>
        </button>

        {/* AI API Key & Scan Mode Status Button */}
        <button
          onClick={onOpenByok}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            (byokConfig.geminiApiKey || byokConfig.openaiApiKey || byokConfig.llmApiKey) &&
            byokConfig.preferredExtractionMode !== 'local'
              ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              : 'border-sky-400/35 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
          }`}
          title="Configure AI API Key or Switch Scan Mode (Gemini, OpenAI, Claude, Groq, or Offline Local Scan)"
        >
          <KeyRound className="h-3.5 w-3.5 shrink-0" />
          <span>
            {!(byokConfig.geminiApiKey || byokConfig.openaiApiKey || byokConfig.llmApiKey)
              ? 'Local Scan (Add AI Key)'
              : byokConfig.preferredExtractionMode === 'local'
              ? 'Local Scan Active (Key Saved)'
              : byokConfig.geminiApiKey?.startsWith('AIza')
              ? 'AI Scan: Google Gemini'
              : `AI Scan: ${byokConfig.detectedProviderName || 'Connected'}`}
          </span>
        </button>

        <div
          onClick={() => router.push(`/documents/${nextPendingDocId}`)}
          className="cursor-pointer hidden 2xl:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors font-mono tracking-tight tabular-nums"
          title="Jump to next document requiring human review"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              telemetry.pendingReviewCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span className="text-[11px]">
            {telemetry.pendingReviewCount > 0
              ? `${telemetry.pendingReviewCount} Pending`
              : 'All Verified'}
          </span>
        </div>
      </div>
    </header>
  );
}
