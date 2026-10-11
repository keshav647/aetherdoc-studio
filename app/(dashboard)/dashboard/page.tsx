'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAppStore } from '@/store/useAppStore';
import { TelemetryGrid } from '@/components/dashboard/TelemetryGrid';
import { IngestionDropzone } from '@/components/dashboard/IngestionDropzone';
import { VerificationQueueTable } from '@/components/dashboard/VerificationQueueTable';
import { SupabaseSyncModal, SupabaseLogo } from '@/components/common/SupabaseSyncModal';
import { ArrowRight, Layers } from 'lucide-react';

gsap.registerPlugin(useGSAP);

export default function DashboardOverviewPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);

  const {
    documents,
    telemetry,
    activeTenant,
    batchVerifyDocument,
    byokConfig,
  } = useAppStore();

  const nextPendingDoc =
    documents.find((d) => !d.isDemo && d.status !== 'verified') ||
    documents.find((d) => d.status !== 'verified') ||
    documents[0];

  useGSAP(
    () => {
      gsap.from('.dashboard-stagger-section', {
        y: 18,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power3.out',
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="space-y-7 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="dashboard-stagger-section flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono text-[11px] tracking-tight tabular-nums text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{activeTenant.name}</span>
            <span>•</span>
            <span className="text-sky-300">
              {telemetry.reconciledCount} of {telemetry.totalDocuments} Verified
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white font-editorial sm:text-3xl">
            Upload &amp; Document Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload your own local invoices or contracts, paste raw text to extract fields, or sync directly with your Supabase database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prominent Official Supabase Button (#3ECF8E + Lightning Bolt SVG) */}
          <button
            type="button"
            onClick={() => setIsSupabaseOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#3ECF8E]/40 bg-[#3ECF8E]/12 px-4 py-2 text-xs font-semibold text-[#3ECF8E] hover:bg-[#3ECF8E]/22 transition-all shadow-[0_0_20px_rgba(62,207,142,0.16)]"
          >
            <SupabaseLogo className="h-4 w-4" />
            <span>
              {byokConfig.isSupabaseConnected
                ? 'Sync with Supabase DB'
                : 'Connect Supabase DB'}
            </span>
          </button>

          {nextPendingDoc && (
            <button
              onClick={() => router.push(`/documents/${nextPendingDoc.id}`)}
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#07090E] px-4 py-2 text-xs font-semibold hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              <Layers className="h-3.5 w-3.5 text-[#07090E]" />
              <span>Open Review Studio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Upload & Paste Workspace FIRST */}
      <div className="dashboard-stagger-section">
        <IngestionDropzone />
      </div>

      {/* Live Summary Cards */}
      <div className="dashboard-stagger-section">
        <TelemetryGrid telemetry={telemetry} />
      </div>

      {/* Document Review Queue Table */}
      <div className="dashboard-stagger-section">
        <VerificationQueueTable
          documents={documents}
          onQuickApprove={(docId) => batchVerifyDocument(docId)}
        />
      </div>

      <SupabaseSyncModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />
    </div>
  );
}
