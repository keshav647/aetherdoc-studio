'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { DocumentRecord, ExtractedField, AuditLog } from '@/lib/extraction/types';
import {
  reExtractExistingDocumentWithAi,
  detectAiProviderFromKey,
  getActiveKeyFromConfig,
} from '@/lib/extraction/universalExtractor';
import {
  ArrowLeft,
  History,
  Download,
  FileText,
  Keyboard,
  ChevronDown,
  UploadCloud,
  Sparkles,
  Loader2,
  Cpu,
  Trash2,
} from 'lucide-react';

interface StudioHeaderProps {
  document: DocumentRecord;
  allDocuments: DocumentRecord[];
  fields: ExtractedField[];
  auditLogs: AuditLog[];
  onOpenAuditDrawer: () => void;
  onOpenHotkeyGuide: () => void;
}

export function StudioHeader({
  document,
  allDocuments,
  fields,
  auditLogs,
  onOpenAuditDrawer,
  onOpenHotkeyGuide,
}: StudioHeaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    byokConfig,
    saveByokConfig,
    replaceDocumentExtraction,
    deleteDocument,
    promptByokForUnsupportedFile,
    requestFileConfirmation,
  } = useAppStore();

  const [isAiRunning, setIsAiRunning] = useState(false);
  const [runningTargetMode, setRunningTargetMode] = useState<'ai' | 'local' | null>(null);

  const activeAiKey = getActiveKeyFromConfig(byokConfig);
  const hasActiveAiKey = Boolean(activeAiKey);
  const detectedProvider = detectAiProviderFromKey(activeAiKey);

  const isLocalEngineActive = document.extraction_engine
    ? /^Local/i.test(document.extraction_engine)
    : !hasActiveAiKey || byokConfig.preferredExtractionMode === 'local';

  const handleReExtract = async (forceLocal = false) => {
    setIsAiRunning(true);
    setRunningTargetMode(forceLocal ? 'local' : 'ai');
    saveByokConfig({ preferredExtractionMode: forceLocal ? 'local' : 'ai' });
    try {
      const result = await reExtractExistingDocumentWithAi(
        document,
        fields,
        byokConfig,
        forceLocal
      );
      if (result && result.fields.length > 0) {
        const allVerified = result.fields.every((f) => f.status === 'verified');
        replaceDocumentExtraction(
          document.id,
          result.fields,
          {
            document_type: result.documentType,
            vendor_name: result.vendorName,
            page_count: result.pageCount,
            status: allVerified ? 'verified' : 'review_required',
          },
          result.engineLabel
        );
      }
    } finally {
      setIsAiRunning(false);
      setRunningTargetMode(null);
    }
  };

  const handleStudioFileUpload = (file: File) => {
    requestFileConfirmation({
      sourceType: 'local',
      localFile: file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      sourceLabel: 'Local Computer File',
    });
  };

  const handleExportJson = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      document: {
        id: document.id,
        file_name: document.file_name,
        document_type: document.document_type,
        vendor_name: document.vendor_name,
        status: document.status,
        accuracy_rate: document.accuracy_rate,
        extraction_engine: document.extraction_engine || 'AetherDoc Studio',
      },
      extracted_fields: fields.map((f) => ({
        key: f.field_key,
        label: f.label,
        value: f.field_value,
        category: f.category,
        confidence: f.confidence,
        status: f.status,
        page_number: f.page_number,
        normalized_bbox: f.bbox,
      })),
      audit_trail: auditLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.id}_verified_extraction.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative shrink-0 flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0F19]/90 px-3.5 py-2.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.42),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.csv,.json,.md,.png,.jpg,.jpeg,.webp,.xlsx,.pptx,.rtf,.html"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleStudioFileUpload(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          onClick={() => router.push('/documents')}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors shrink-0"
          title="Back to Documents"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-3.5 w-3.5 text-sky-400 shrink-0" />

            {/* Live Document Switcher Dropdown — strictly bounded with w-full so it never overlaps sibling badges */}
            <div className="relative w-[170px] sm:w-[210px] lg:w-[240px] shrink-0">
              <select
                value={document.id}
                onChange={(e) => router.push(`/documents/${e.target.value}`)}
                aria-label="Switch Active Document"
                className="block w-full min-w-0 appearance-none cursor-pointer rounded-lg border border-white/[0.08] bg-[#111726] pl-2.5 pr-7 py-1 text-xs font-semibold text-white hover:border-white/20 focus:outline-none transition-colors truncate"
              >
                {allDocuments.map((doc) => (
                  <option key={doc.id} value={doc.id} className="bg-[#07090E] text-white">
                    {doc.isDemo ? `[Sample] ${doc.file_name}` : doc.file_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {document.isDemo ? (
              <span className="hidden sm:inline-flex items-center rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-amber-300 shrink-0 whitespace-nowrap">
                SAMPLE DOC
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center rounded-full border border-sky-400/35 bg-sky-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-sky-300 shrink-0 whitespace-nowrap">
                YOUR UPLOAD
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-1 font-mono tracking-tight tabular-nums truncate">
            {document.vendor_name || 'Uploaded Document'} • Confidence:{' '}
            <span className="text-sky-300 font-medium">{document.accuracy_rate}%</span> • Engine:{' '}
            <span className={isLocalEngineActive ? 'text-sky-300 font-medium' : 'text-emerald-300 font-medium'}>
              {isLocalEngineActive
                ? 'Local Scan (Offline PDF.js)'
                : `AI Scan (${document.extraction_engine || detectedProvider.name})`}
            </span>
          </p>
        </div>
      </div>

      {/* Right Action Bar (Compact & Wrap-Safe so nothing is ever cut off) */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <div
          className={`flex items-center rounded-xl border p-0.5 gap-1 ${
            isLocalEngineActive
              ? 'border-sky-400/35 bg-[#07090E]'
              : 'border-emerald-400/35 bg-[#07090E]'
          }`}
        >
          {/* Option 1: AI Scan (prompts for API key if none is configured) */}
          <button
            onClick={() => {
              if (!hasActiveAiKey) {
                promptByokForUnsupportedFile('__AI_SCAN__');
                return;
              }
              handleReExtract(false);
            }}
            disabled={isAiRunning}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all whitespace-nowrap disabled:opacity-50 ${
              !isLocalEngineActive && hasActiveAiKey
                ? 'border border-emerald-400/50 bg-emerald-500/20 text-emerald-200 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-300 font-medium'
            }`}
            title={
              hasActiveAiKey
                ? `Switch to AI Scan & Re-Extract (${detectedProvider.name})`
                : 'Click to add an AI API Key and enable AI Scan'
            }
          >
            {isAiRunning && runningTargetMode === 'ai' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400 shrink-0" />
            ) : (
              <Sparkles
                className={`h-3.5 w-3.5 shrink-0 ${
                  !isLocalEngineActive && hasActiveAiKey ? 'text-emerald-400' : 'text-slate-400'
                }`}
              />
            )}
            <span>
              {isAiRunning && runningTargetMode === 'ai'
                ? 'AI Scanning...'
                : !isLocalEngineActive && hasActiveAiKey
                ? 'AI Scan • Active'
                : 'Switch to AI Scan'}
            </span>
          </button>

          {/* Option 2: Neutral Local PDF.js Scan */}
          <button
            onClick={() => handleReExtract(true)}
            disabled={isAiRunning}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all whitespace-nowrap disabled:opacity-50 ${
              isLocalEngineActive
                ? 'border border-sky-400/50 bg-sky-500/20 text-sky-200 font-semibold shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                : 'text-slate-400 hover:bg-sky-500/15 hover:text-sky-300 font-medium'
            }`}
            title="Switch to Local PDF.js Section Parser (100% offline, zero API calls)"
          >
            {isAiRunning && runningTargetMode === 'local' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400 shrink-0" />
            ) : (
              <Cpu
                className={`h-3.5 w-3.5 shrink-0 ${
                  isLocalEngineActive ? 'text-sky-400' : 'text-slate-400'
                }`}
              />
            )}
            <span>
              {isAiRunning && runningTargetMode === 'local'
                ? 'Local Scanning...'
                : isLocalEngineActive
                ? 'Local Scan • Active'
                : 'Switch to Local Scan'}
            </span>
          </button>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAiRunning}
          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 hover:text-white transition-colors disabled:opacity-50"
          title="Upload a local PDF, DOCX, image, or text file directly into Review Studio"
        >
          <UploadCloud className="h-3.5 w-3.5" />
          <span>+ Upload</span>
        </button>

        <button
          onClick={onOpenHotkeyGuide}
          className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-xs font-mono text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="h-3.5 w-3.5 text-sky-400" />
          <kbd className="rounded border border-white/10 bg-white/[0.05] px-1 text-[10px] text-slate-400">
            ?
          </kbd>
        </button>

        <button
          onClick={handleExportJson}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
          title="Export Verified JSON"
        >
          <Download className="h-3.5 w-3.5 text-sky-400" />
          <span className="hidden xl:inline">JSON</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const remaining = allDocuments.filter((d) => d.id !== document.id);
            deleteDocument(document.id);
            if (remaining.length > 0) {
              router.push(`/documents/${remaining[0].id}`);
            } else {
              router.push('/documents');
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 hover:text-white transition-colors"
          title={`Delete ${document.file_name}`}
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          <span>Delete</span>
        </button>

        <button
          onClick={onOpenAuditDrawer}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs font-mono tracking-tight tabular-nums font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
          title="View Audit History"
        >
          <History className="h-3.5 w-3.5 text-sky-400" />
          <span>{auditLogs.length}</span>
        </button>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono tracking-tight font-medium border border-white/[0.08] bg-white/[0.04] ${
            document.status === 'verified' ? 'text-emerald-300' : 'text-amber-300'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              document.status === 'verified' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          {document.status === 'verified' ? 'Verified' : 'Review'}
        </span>
      </div>
    </div>
  );
}
