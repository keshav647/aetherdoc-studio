'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, LayoutGroup } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { DocumentRecord } from '@/lib/extraction/types';
import { formatDate, formatBytes } from '@/lib/utils';
import { SupabaseSyncModal, SupabaseLogo } from '@/components/common/SupabaseSyncModal';
import {
  FileText,
  Search,
  ArrowRight,
  CheckCircle2,
  Trash2,
  LayoutGrid,
  List,
  UploadCloud,
  EyeOff,
  Eye,
  RotateCcw,
  Cloud,
} from 'lucide-react';

export default function DocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    documents,
    fieldsByDoc,
    byokConfig,
    hideDemoSamples,
    toggleHideDemoSamples,
    restoreDemoSamples,
    batchVerifyDocument,
    deleteDocument,
    setCloudStorageModalOpen,
    requestFileConfirmation,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'review_required' | 'verified'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);

  const handleDirectLocalUpload = (file: File) => {
    requestFileConfirmation({
      sourceType: 'local',
      localFile: file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      sourceLabel: 'Local Computer File',
    });
  };

  const visibleDocs = hideDemoSamples
    ? documents.filter((d) => !d.isDemo)
    : documents;

  const filteredDocs = visibleDocs.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.vendor_name && doc.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const userUploadedDocs = filteredDocs.filter((d) => !d.isDemo);
  const demoSampleDocs = filteredDocs.filter((d) => d.isDemo);
  const totalDemoCount = documents.filter((d) => d.isDemo).length;

  const renderDocCard = (doc: DocumentRecord) => {
    const isVerified = doc.status === 'verified';
    const docFields = fieldsByDoc[doc.id] || [];
    const verifiedFieldsCount = docFields.filter((f) => f.status === 'verified').length;

    return (
      <div
        key={doc.id}
        onClick={() => router.push(`/documents/${doc.id}`)}
        className="group cursor-pointer relative rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] hover:border-sky-400/40 hover:bg-[#0E1422] transition-colors flex flex-col justify-between"
      >
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-sky-400">
                <FileText className="h-4 w-4" />
              </div>
              {doc.isDemo ? (
                <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                  DEMO SAMPLE
                </span>
              ) : (
                <span className="rounded-full border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-300">
                  YOUR UPLOAD
                </span>
              )}
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono tracking-tight font-medium border border-white/[0.08] bg-white/[0.04] ${
                isVerified ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isVerified ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {isVerified ? 'VERIFIED' : 'NEEDS REVIEW'}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
            {doc.file_name}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
            {doc.vendor_name || 'Uploaded Document'}
          </p>
        </div>

        <div className="mt-5 border-t border-white/[0.06] pt-3 space-y-2">
          <div className="flex justify-between text-[11px] text-slate-400 font-mono tracking-tight tabular-nums">
            <span>{doc.document_type}</span>
            <span>
              {verifiedFieldsCount}/{docFields.length} Fields • {doc.page_count} Pgs
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 text-[11px]">Confidence Score:</span>
            <span
              className={`font-mono font-semibold tracking-tight tabular-nums ${
                doc.accuracy_rate >= 90 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {doc.accuracy_rate}%
            </span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-1.5">
              {!isVerified && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    batchVerifyDocument(doc.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-mono text-emerald-300 hover:bg-white/[0.08] transition-colors"
                  title="Approve all fields"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve
                </button>
              )}
              {documents.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDocument(doc.id);
                  }}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-1 text-slate-500 hover:text-rose-400 hover:bg-white/[0.06] transition-colors"
                  title="Remove document"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
              Open Studio <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.csv,.json,.md,.png,.jpg,.jpeg,.webp,.xlsx,.pptx,.rtf,.html"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleDirectLocalUpload(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white font-editorial sm:text-3xl">
            Documents &amp; Uploads
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload your own files for extraction and verification, sync with Supabase, or inspect the 2 minimal demo samples below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Universal Cloud Object Storage Button (Cloudflare R2 / S3 / Azure / GCS) */}
          <button
            type="button"
            onClick={() => setCloudStorageModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/12 px-4 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/22 transition-colors shadow-[0_0_18px_rgba(249,115,22,0.14)]"
          >
            <Cloud className="h-4 w-4 text-orange-400" />
            <span>
              {byokConfig.cloudStorage?.isConnected
                ? `Search ${byokConfig.cloudStorage.bucketName}`
                : 'Connect Cloud Storage'}
            </span>
          </button>

          {/* Official Supabase Sync Button (#3ECF8E + Lightning Bolt SVG) */}
          <button
            type="button"
            onClick={() => setIsSupabaseOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#3ECF8E]/40 bg-[#3ECF8E]/12 px-4 py-2 text-xs font-semibold text-[#3ECF8E] hover:bg-[#3ECF8E]/22 transition-colors shadow-[0_0_18px_rgba(62,207,142,0.14)]"
          >
            <SupabaseLogo className="h-4 w-4" />
            <span>
              {byokConfig.isSupabaseConnected ? 'Supabase Synced' : 'Sync with Supabase'}
            </span>
          </button>

          {/* Direct Local Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-white text-[#07090E] px-4 py-2 text-xs font-semibold hover:bg-slate-200 transition-all"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>+ Upload Local File</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & Demo Toggle Bar */}
      <div className="relative flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-3.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by file name or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-black/40 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-400/50 focus:outline-none"
          />
        </div>

        {/* Status Tabs + Demo Toggle + View Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {totalDemoCount > 0 ? (
            <button
              type="button"
              onClick={toggleHideDemoSamples}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white transition-colors"
            >
              {hideDemoSamples ? (
                <>
                  <Eye className="h-3.5 w-3.5 text-sky-400" />
                  <span>Show Demo Samples ({totalDemoCount})</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-amber-300" />
                  <span>Hide Demo Samples</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={restoreDemoSamples}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-sky-400" />
              <span>Restore 2 Demo Samples</span>
            </button>
          )}

          <LayoutGroup id="ledgerPageStatusTabs">
            <div className="flex items-center rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
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
                const active = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
                    className={`relative rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      active ? 'text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="ledgerStatusActivePill"
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

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by Document Type"
            className="rounded-xl border border-white/[0.08] bg-black/40 px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="INVOICE">Invoices</option>
            <option value="CONTRACT">Contracts</option>
            <option value="BALANCE_SHEET">Financial Statements</option>
            <option value="AUDIT_STATEMENT">Audit Reports</option>
          </select>

          <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View: Separated into Your Uploaded Documents vs Demo Sample Documents */}
      {viewMode === 'grid' ? (
        <div className="space-y-8">
          {/* Section 1: Your Uploaded Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Your Uploaded &amp; Synced Documents
                </h2>
                <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-300">
                  {userUploadedDocs.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                Paste Raw Text Instead →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Interactive Upload Card Always Available First */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-sky-400/30 bg-sky-500/[0.04] hover:border-sky-400/60 hover:bg-sky-500/[0.08] p-5 transition-colors flex flex-col items-center justify-center text-center min-h-[210px]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-400/30 text-sky-400 mb-3">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-white">
                  + Upload Your Own Document
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-[230px]">
                  Select any local PDF, image, CSV, JSON, or text file to extract fields and open in Review Studio.
                </p>
              </div>

              {userUploadedDocs.map((doc) => renderDocCard(doc))}
            </div>
          </div>

          {/* Section 2: Minimal Demo Samples (only shown when not hidden) */}
          {!hideDemoSamples && demoSampleDocs.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-300">
                    Demo Sample Documents (For Showcase &amp; Testing)
                  </h2>
                  <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                    {demoSampleDocs.length} Samples
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleHideDemoSamples}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Hide Demo Samples
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {demoSampleDocs.map((doc) => renderDocCard(doc))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="relative rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Document</th>
                <th className="pb-3 font-semibold">Source</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Size / Pages</th>
                <th className="pb-3 font-semibold">Confidence</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 text-right font-semibold">Action</th>
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
                    <td className="py-3">
                      <p className="font-semibold text-white group-hover:text-sky-300">
                        {doc.file_name}
                      </p>
                      <p className="text-[11px] text-slate-400">{doc.vendor_name}</p>
                    </td>
                    <td className="py-3">
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
                    <td className="py-3 font-mono text-[11px] text-slate-300">
                      {doc.document_type}
                    </td>
                    <td className="py-3 font-mono tracking-tight tabular-nums text-slate-400">
                      {formatBytes(doc.file_size)} • {doc.page_count}p
                    </td>
                    <td className="py-3 font-mono tracking-tight tabular-nums font-semibold text-emerald-400">
                      {doc.accuracy_rate}%
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-slate-200">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isVerified ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                        {isVerified ? 'VERIFIED' : 'NEEDS REVIEW'}
                      </span>
                    </td>
                    <td className="py-3 font-mono tracking-tight tabular-nums text-slate-400">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-sky-400 font-medium">
                        Review <ArrowRight className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SupabaseSyncModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />
    </div>
  );
}
