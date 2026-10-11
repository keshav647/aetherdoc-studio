'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, LayoutGroup } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { DocumentRecord } from '@/lib/extraction/types';
import { formatDate } from '@/lib/utils';
import {
  FileText,
  ArrowRight,
  Layers,
  CheckCircle2,
  EyeOff,
  Eye,
} from 'lucide-react';

interface VerificationQueueTableProps {
  documents: DocumentRecord[];
  onQuickApprove: (docId: string) => void;
}

export function VerificationQueueTable({
  documents,
  onQuickApprove,
}: VerificationQueueTableProps) {
  const router = useRouter();
  const { hideDemoSamples, toggleHideDemoSamples } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'review_required' | 'verified'>('all');

  const visibleDocs = hideDemoSamples
    ? documents.filter((d) => !d.isDemo)
    : documents;

  const filteredDocs = visibleDocs.filter((d) => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const userUploadsCount = documents.filter((d) => !d.isDemo).length;
  const demoCount = documents.filter((d) => d.isDemo).length;

  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-sky-400" />
              Document Review Queue
            </h3>
            <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 font-mono text-[10px] text-sky-300">
              {userUploadsCount} Your {userUploadsCount === 1 ? 'Upload' : 'Uploads'}
            </span>
            {demoCount > 0 && !hideDemoSamples && (
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
                {demoCount} Demo Samples
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Click any document below to inspect its highlighted fields in the Review Studio or approve it in one click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {demoCount > 0 && (
            <button
              type="button"
              onClick={toggleHideDemoSamples}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white transition-colors"
            >
              {hideDemoSamples ? (
                <>
                  <Eye className="h-3.5 w-3.5 text-sky-400" />
                  <span>Show Demo Samples ({demoCount})</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-amber-300" />
                  <span>Hide Demo Samples</span>
                </>
              )}
            </button>
          )}

          <LayoutGroup id="queueFilterTabs">
            <div className="flex items-center rounded-xl border border-white/[0.07] bg-white/[0.02] p-1 text-xs">
              {[
                { key: 'all', label: `All (${visibleDocs.length})` },
                {
                  key: 'review_required',
                  label: `Needs Review (${
                    visibleDocs.filter((d) => d.status !== 'verified').length
                  })`,
                },
                {
                  key: 'verified',
                  label: `Verified (${
                    visibleDocs.filter((d) => d.status === 'verified').length
                  })`,
                },
              ].map((tab) => {
                const active = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as typeof filter)}
                    className={`relative rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      active ? 'text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="queueFilterPill"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-white/[0.08] border border-white/[0.10]"
                      />
                    )}
                    <span className="relative z-10 font-mono tracking-tight tabular-nums">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <button
            onClick={() => router.push('/documents')}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium shrink-0"
          >
            All Documents <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Empty State when Demo Samples are hidden and no uploads exist yet */}
      {filteredDocs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.1] bg-[#07090E]/60 p-8 text-center">
          <p className="text-sm font-semibold text-white">
            No documents match the current view
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Upload a local file in the panel above, or toggle Demo Samples back on to explore example documents.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Document &amp; Organization</th>
                <th className="pb-3 font-semibold">Source</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Confidence</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredDocs.map((doc) => {
                const isVerified = doc.status === 'verified';

                return (
                  <tr
                    key={doc.id}
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    className="group cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-sky-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                            {doc.file_name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {doc.vendor_name || 'Uploaded Document'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5">
                      {doc.isDemo ? (
                        <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                          DEMO SAMPLE
                        </span>
                      ) : (
                        <span className="rounded-full border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-300">
                          YOUR UPLOAD
                        </span>
                      )}
                    </td>

                    <td className="py-3.5">
                      <span className="rounded bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-slate-300">
                        {doc.document_type}
                      </span>
                    </td>

                    <td className="py-3.5">
                      <span
                        className={`font-mono font-semibold tracking-tight tabular-nums ${
                          doc.accuracy_rate >= 90
                            ? 'text-emerald-400'
                            : doc.accuracy_rate >= 75
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {doc.accuracy_rate}%
                      </span>
                    </td>

                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono tracking-tight font-medium border bg-white/[0.04] border-white/[0.08] ${
                          isVerified ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isVerified ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                        {isVerified ? 'VERIFIED' : 'NEEDS REVIEW'}
                      </span>
                    </td>

                    <td className="py-3.5 text-slate-400 font-mono tracking-tight tabular-nums text-[11px]">
                      {formatDate(doc.created_at)}
                    </td>

                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {!isVerified && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickApprove(doc.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-emerald-300 hover:bg-white/[0.08] transition-all text-xs"
                            title="Approve all fields in document"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Approve</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/documents/${doc.id}`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-slate-200 hover:bg-white/[0.08] hover:text-white transition-all text-xs"
                        >
                          <span>Review</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
