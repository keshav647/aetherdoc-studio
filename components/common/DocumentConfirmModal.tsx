'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import {
  processUploadedDocumentFile,
  isFileSupportedLocally,
  getActiveKeyFromConfig,
  detectAiProviderFromKey,
  LOCAL_SUPPORTED_LABEL,
} from '@/lib/extraction/universalExtractor';
import { formatBytes } from '@/lib/utils';
import {
  FileCheck2,
  X,
  Sparkles,
  Cpu,
  HardDrive,
  Cloud,
  Database,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const CONFIRM_PIPELINE_STEPS = [
  { id: 1, label: 'Reading Document', detail: 'Fetching & verifying payload' },
  { id: 2, label: 'Stream Decompression', detail: 'Decoding PDF / DOCX / Text' },
  { id: 3, label: 'Field Extraction', detail: 'Dynamic multi-page categorization' },
  { id: 4, label: 'Confidence Check', detail: 'Scoring extracted fields' },
  { id: 5, label: 'Opening Review Studio', detail: 'Syncing to workspace' },
];

export function DocumentConfirmModal() {
  const router = useRouter();
  const {
    pendingFileConfirmation,
    requestFileConfirmation,
    byokConfig,
    saveByokConfig,
    activeTenant,
    ingestDocument,
    promptByokForUnsupportedFile,
  } = useAppStore();

  const activeAiKey = getActiveKeyFromConfig(byokConfig);
  const hasActiveAiKey = Boolean(activeAiKey);
  const detectedProvider = detectAiProviderFromKey(activeAiKey);

  const [selectedMode, setSelectedMode] = useState<'ai' | 'local'>(
    hasActiveAiKey ? byokConfig.preferredExtractionMode || 'ai' : 'local'
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (pendingFileConfirmation) {
      setSelectedMode(
        hasActiveAiKey ? byokConfig.preferredExtractionMode || 'ai' : 'local'
      );
      setIsConfirming(false);
      setStepIndex(0);
      setErrorMsg(null);
    }
  }, [pendingFileConfirmation, hasActiveAiKey, byokConfig.preferredExtractionMode]);

  if (!pendingFileConfirmation) return null;

  const isLocalSupported = isFileSupportedLocally({
    name: pendingFileConfirmation.fileName,
    type: pendingFileConfirmation.fileType,
  });

  const handleClose = () => {
    if (isConfirming) return;
    requestFileConfirmation(null);
  };

  const handleSelectAiMode = () => {
    if (!hasActiveAiKey) {
      promptByokForUnsupportedFile('__AI_SCAN__');
      return;
    }
    setSelectedMode('ai');
    saveByokConfig({ preferredExtractionMode: 'ai' });
  };

  const handleSelectLocalMode = () => {
    setSelectedMode('local');
    saveByokConfig({ preferredExtractionMode: 'local' });
  };

  const handleConfirmImport = async () => {
    setErrorMsg(null);

    // Gatekeeper: if user selected AI Scan without an API key, open the API key dialog
    if (selectedMode === 'ai' && !hasActiveAiKey) {
      promptByokForUnsupportedFile('__AI_SCAN__');
      return;
    }

    // Gatekeeper: if file format is not supported locally and user is in Local Scan mode (or has no key), ask for API key
    if ((selectedMode === 'local' || !hasActiveAiKey) && !isLocalSupported) {
      const targetName = pendingFileConfirmation.fileName;
      requestFileConfirmation(null);
      promptByokForUnsupportedFile(targetName);
      return;
    }

    setIsConfirming(true);
    setStepIndex(0);

    const stepTimer = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, CONFIRM_PIPELINE_STEPS.length - 2));
    }, 240);

    const targetTenantId =
      activeTenant.id === 'all'
        ? 'a0000000-0000-0000-0000-000000000001'
        : activeTenant.id;

    try {
      let fileToProcess: File | undefined = pendingFileConfirmation.localFile;

      // If importing from Cloud Object Storage (Cloudflare R2, AWS S3, Azure Blob, GCS) or Supabase
      if (!fileToProcess && pendingFileConfirmation.remoteItem) {
        const remote = pendingFileConfirmation.remoteItem;

        if (remote.rawText) {
          fileToProcess = new File([remote.rawText], remote.fileName, {
            type: remote.contentType || 'text/plain',
          });
        } else {
          const cloudCfg = byokConfig.cloudStorage;
          const res = await fetch('/api/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'fetch',
              config: cloudCfg,
              provider: remote.source === 'supabase' ? 'cloudflare_r2' : remote.source,
              endpointUrl: cloudCfg?.endpointUrl,
              accountId: cloudCfg?.accountId,
              bucketName: remote.bucketName || cloudCfg?.bucketName,
              accessKeyId: cloudCfg?.accessKeyId,
              secretAccessKey: cloudCfg?.secretAccessKey,
              region: cloudCfg?.region,
              sasToken: cloudCfg?.sasToken || cloudCfg?.sasOrPublicUrl,
              objectKey: remote.key,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data?.ok) {
            throw new Error(data?.error || 'Failed to download file from cloud storage.');
          }

          if (data.rawText) {
            fileToProcess = new File([data.rawText], remote.fileName, {
              type: remote.contentType || 'text/plain',
            });
          } else if (data.base64Data) {
            const binaryStr = atob(data.base64Data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            fileToProcess = new File([bytes], remote.fileName, {
              type: data.mimeType || remote.contentType || 'application/pdf',
            });
          }
        }
      }

      if (!fileToProcess) {
        throw new Error('No file payload available to import.');
      }

      const result = await processUploadedDocumentFile(
        fileToProcess,
        byokConfig,
        targetTenantId,
        selectedMode
      );

      clearInterval(stepTimer);
      setStepIndex(CONFIRM_PIPELINE_STEPS.length - 1);

      // Tag vendor/source context if imported from Cloud Storage or Supabase
      if (pendingFileConfirmation.sourceType !== 'local') {
        result.document.extraction_engine = `${result.engineLabel} • ${pendingFileConfirmation.sourceLabel}`;
      }

      ingestDocument(
        result.document,
        result.fields,
        result.chunkText || undefined
      );

      const callback = pendingFileConfirmation.onConfirmed;
      const newDocId = result.document.id;

      // Brief pause at 100% ("Opening Review Studio") so the user sees the completed progress bar before entering Studio
      await new Promise((r) => setTimeout(r, 320));

      requestFileConfirmation(null);
      setIsConfirming(false);

      if (callback) {
        callback(newDocId);
      } else {
        router.push(`/documents/${newDocId}`);
      }
    } catch (err) {
      clearInterval(stepTimer);
      setIsConfirming(false);
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to import and analyze document.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#0B0F19] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400">
              {isConfirming ? (
                <Cpu className="h-5 w-5 animate-spin text-sky-400" />
              ) : (
                <FileCheck2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                {isConfirming
                  ? 'Extracting & Calibrating Document...'
                  : 'Confirm Document Import'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isConfirming
                  ? `Running ${
                      selectedMode === 'ai' && hasActiveAiKey
                        ? `${detectedProvider.name} (Single Optimized Call)`
                        : 'Local PDF.js Section Parser'
                    }`
                  : 'Verify file details and extraction mode before adding to your workspace.'}
              </p>
            </div>
          </div>
          {!isConfirming && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* File Summary Card */}
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#07090E] p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-sky-300">
              {pendingFileConfirmation.sourceType === 'local' ? (
                <HardDrive className="h-3 w-3" />
              ) : pendingFileConfirmation.sourceType === 'supabase' ? (
                <Database className="h-3 w-3 text-[#3ECF8E]" />
              ) : (
                <Cloud className="h-3 w-3 text-amber-400" />
              )}
              <span>Source: {pendingFileConfirmation.sourceLabel}</span>
            </span>

            <span className="font-mono text-[11px] text-slate-400">
              {formatBytes(pendingFileConfirmation.fileSize || 2048)}
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold text-white break-all">
              {pendingFileConfirmation.fileName}
            </p>
            {pendingFileConfirmation.bucketOrTable && (
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Container / Table:{' '}
                <span className="text-slate-300">
                  {pendingFileConfirmation.bucketOrTable}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Live 5-Step Progress Screen when Confirm is clicked */}
        {isConfirming ? (
          <div className="mt-4 rounded-xl border border-sky-400/25 bg-[#07090E] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>
                  Step {stepIndex + 1} of {CONFIRM_PIPELINE_STEPS.length}:{' '}
                  {CONFIRM_PIPELINE_STEPS[stepIndex]?.label}
                </span>
              </span>
              <span className="font-mono text-xs font-semibold text-sky-300 tabular-nums">
                {Math.round(((stepIndex + 1) / CONFIRM_PIPELINE_STEPS.length) * 100)}%
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${((stepIndex + 1) / CONFIRM_PIPELINE_STEPS.length) * 100}%`,
                }}
              />
            </div>

            <div className="space-y-1.5 pt-1">
              {CONFIRM_PIPELINE_STEPS.map((step, idx) => {
                const isDone = idx < stepIndex;
                const isCurrent = idx === stepIndex;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all ${
                      isDone
                        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                        : isCurrent
                        ? 'border-sky-400/40 bg-sky-500/15 text-white font-semibold'
                        : 'border-white/[0.04] bg-white/[0.01] text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <Cpu className="h-3.5 w-3.5 text-sky-400 animate-spin shrink-0" />
                      ) : (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/10 font-mono text-[9px]">
                          {step.id}
                        </span>
                      )}
                      <span>{step.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {step.detail}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Unsupported Local Format Notice */}
            {!isLocalSupported && !hasActiveAiKey && (
              <div className="mt-3 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">
                    AI API Key Required for This Format
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-200/90">
                    Local Scan supports{' '}
                    <span className="font-mono text-white">
                      {LOCAL_SUPPORTED_LABEL}
                    </span>
                    . Click <strong className="text-white">AI Scan</strong> below to
                    connect an API key for this file.
                  </p>
                </div>
              </div>
            )}

            {/* Scan Mode Selector */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Select Analysis Engine for This Document
                </label>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                    selectedMode === 'ai' && hasActiveAiKey
                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-sky-400/40 bg-sky-500/15 text-sky-300'
                  }`}
                >
                  {selectedMode === 'ai' && hasActiveAiKey
                    ? `Active: AI Scan (${detectedProvider.name})`
                    : 'Active: Local Scan (Offline PDF.js)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleSelectAiMode}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    selectedMode === 'ai' && hasActiveAiKey
                      ? 'border-emerald-400/60 bg-emerald-500/15 text-white shadow-[0_0_16px_rgba(16,185,129,0.18)]'
                      : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white hover:border-emerald-400/30'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                      <span>AI Scan</span>
                    </span>
                    {selectedMode === 'ai' && hasActiveAiKey && (
                      <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-emerald-300">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {hasActiveAiKey
                      ? `${detectedProvider.name} • Dynamic AI categories`
                      : 'Click to connect an AI API key'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSelectLocalMode}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    selectedMode === 'local' || !hasActiveAiKey
                      ? 'border-sky-400/60 bg-sky-500/15 text-white shadow-[0_0_16px_rgba(56,189,248,0.18)]'
                      : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white hover:border-sky-400/30'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-sky-400" />
                      <span>Local Scan</span>
                    </span>
                    {(selectedMode === 'local' || !hasActiveAiKey) && (
                      <span className="rounded bg-sky-400/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-sky-300">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    100% Offline PDF.js • 0 API Calls
                  </span>
                </button>
              </div>

              {/* Clear explanation of the selected scan mode */}
              <div
                className={`rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${
                  selectedMode === 'ai' && hasActiveAiKey
                    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                    : 'border-sky-400/25 bg-sky-500/10 text-sky-200'
                }`}
              >
                {selectedMode === 'ai' && hasActiveAiKey ? (
                  <>
                    <strong>AI Scan Selected:</strong> Uses <strong>{detectedProvider.name}</strong> to extract and dynamically categorize fields across all pages.
                  </>
                ) : (
                  <>
                    <strong>Local Scan Selected:</strong> Runs 100% offline in your browser/server using Mozilla PDF.js &amp; structural section parsing. <strong>No AI API calls will be made.</strong>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {errorMsg && (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Footer Actions */}
        {!isConfirming && (
          <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-white/[0.08] pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-xs font-semibold text-[#07090E] hover:bg-slate-200 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                {selectedMode === 'ai' && hasActiveAiKey
                  ? `Confirm & Run AI Scan (${detectedProvider.shortLabel})`
                  : 'Confirm & Run Local Scan (Offline)'}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
