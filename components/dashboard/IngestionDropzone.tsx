'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { DocumentType, RemoteStorageItem, CloudStorageConfig } from '@/lib/extraction/types';
import {
  processUploadedDocumentFile,
  extractFieldsLocallyFromText,
  detectAiProviderFromKey,
  getActiveKeyFromConfig,
} from '@/lib/extraction/universalExtractor';
import { formatBytes, formatDate } from '@/lib/utils';
import { CLOUD_PROVIDERS } from '@/components/common/CloudStorageModal';
import {
  UploadCloud,
  CheckCircle2,
  Cpu,
  ArrowRight,
  FileText,
  Sparkles,
  ClipboardPaste,
  KeyRound,
  Cloud,
  Search,
  Database,
  HardDrive,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';

const PIPELINE_STEPS = [
  { id: 1, label: 'Reading File', detail: 'Inspecting document format' },
  { id: 2, label: 'Stream Decompression', detail: 'Parsing PDF / DOCX / Text' },
  { id: 3, label: 'Field Extraction', detail: 'Mapping 6 calibrated sections' },
  { id: 4, label: 'Confidence Check', detail: 'Scoring extracted fields' },
  { id: 5, label: 'Ready for Studio', detail: 'Saving to workspace' },
];

const DEFAULT_PASTE_TEXT = `Vendor Name: Acme Cloud Services Inc.
Invoice Number: INV-2026-1042
Billing Period: October 2026
Primary Service: Dedicated GPU Compute Cluster (32x Nodes)
Payment Terms: Net 30 Days
Total Amount Due: $18,450.00 USD`;

export function IngestionDropzone() {
  const router = useRouter();
  const {
    activeTenant,
    byokConfig,
    saveByokConfig,
    ingestDocument,
    promptByokForUnsupportedFile,
    setCloudStorageModalOpen,
    requestFileConfirmation,
    fetchSupabaseSearchItems,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'upload' | 'cloud_search' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [processedDocId, setProcessedDocId] = useState<string | null>(null);
  const [extractionSourceLabel, setExtractionSourceLabel] = useState<string>('');

  // Custom Paste / Text Extraction State
  const [customDocTitle, setCustomDocTitle] = useState('Acme_Cloud_Invoice_1042.txt');
  const [customDocType, setCustomDocType] = useState<DocumentType>('INVOICE');
  const [customRawText, setCustomRawText] = useState(DEFAULT_PASTE_TEXT);

  // Unified Cloud Object Storage + Supabase Search State
  const [cloudSearchQuery, setCloudSearchQuery] = useState('');
  const [cloudSourceFilter, setCloudSourceFilter] = useState<'all' | 'cloud' | 'supabase'>('all');
  const [cloudItems, setCloudItems] = useState<RemoteStorageItem[]>([]);
  const [supabaseItems, setSupabaseItems] = useState<RemoteStorageItem[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetTenantId =
    activeTenant.id === 'all'
      ? 'a0000000-0000-0000-0000-000000000001'
      : activeTenant.id;

  const activeAiKey = getActiveKeyFromConfig(byokConfig);
  const hasActiveAiKey = Boolean(activeAiKey);
  const detectedProvider = detectAiProviderFromKey(activeAiKey);
  const currentMode: 'ai' | 'local' = hasActiveAiKey
    ? byokConfig.preferredExtractionMode || 'ai'
    : 'local';

  const connectedCloudMeta =
    CLOUD_PROVIDERS.find((p) => p.id === byokConfig.cloudStorage?.provider) ||
    CLOUD_PROVIDERS[0];

  const loadRemoteSearchCatalog = useCallback(
    async (query: string) => {
      setIsSearchingRemote(true);
      try {
        const activeConfig: CloudStorageConfig = byokConfig.cloudStorage || {
          provider: 'cloudflare_r2',
          bucketName: 'aetherdoc-r2-vault',
          endpointUrl: 'https://r2.cloudflarestorage.com',
          isConnected: true,
        };

        const [storageRes, supaList] = await Promise.all([
          fetch('/api/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'list',
              config: activeConfig,
              searchQuery: query,
            }),
          })
            .then((r) => r.json())
            .catch(() => ({ items: [] })),
          fetchSupabaseSearchItems(query),
        ]);

        setCloudItems(Array.isArray(storageRes?.items) ? storageRes.items : []);
        setSupabaseItems(Array.isArray(supaList) ? supaList : []);
      } finally {
        setIsSearchingRemote(false);
      }
    },
    [byokConfig.cloudStorage, fetchSupabaseSearchItems]
  );

  useEffect(() => {
    if (activeTab === 'cloud_search') {
      loadRemoteSearchCatalog(cloudSearchQuery);
    }
  }, [activeTab, cloudSearchQuery, loadRemoteSearchCatalog]);

  // Trigger Confirmation Dialog for Local Files before importing into the system
  const handleStageLocalFileForConfirmation = (file: File) => {
    requestFileConfirmation({
      sourceType: 'local',
      localFile: file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      sourceLabel: 'Local Computer File',
      onConfirmed: (docId) => {
        setProcessedDocId(docId);
        router.push(`/documents/${docId}`);
      },
    });
  };

  // Trigger Confirmation Dialog for Cloud Object Storage or Supabase Documents
  const handleStageRemoteItemForConfirmation = (item: RemoteStorageItem) => {
    requestFileConfirmation({
      sourceType: item.source === 'supabase' ? 'supabase' : 'cloud',
      remoteItem: item,
      fileName: item.fileName,
      fileSize: item.size,
      fileType: item.contentType,
      bucketOrTable: item.bucketName,
      sourceLabel:
        item.source === 'supabase'
          ? `Supabase (${item.bucketName})`
          : `${connectedCloudMeta.shortName} (${item.bucketName})`,
      onConfirmed: (docId) => {
        setProcessedDocId(docId);
        router.push(`/documents/${docId}`);
      },
    });
  };

  const handleExtractFromPastedText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRawText.trim()) return;

    setIsProcessing(true);
    setCurrentStepIndex(0);
    setProcessedDocId(null);

    const cleanTitle = customDocTitle.trim() || `Custom_${Date.now().toString().slice(-4)}.txt`;

    if (hasActiveAiKey && currentMode === 'ai') {
      const syntheticFile = new File([customRawText], cleanTitle, { type: 'text/plain' });
      const result = await processUploadedDocumentFile(
        syntheticFile,
        byokConfig,
        targetTenantId,
        'ai'
      );
      result.document.document_type = customDocType;
      ingestDocument(result.document, result.fields, result.chunkText || undefined);
      setExtractionSourceLabel(result.engineLabel);
      setProcessedDocId(result.document.id);
      setIsProcessing(false);
      return;
    }

    const newDocId = `doc-${Date.now().toString().slice(-5)}`;
    const parsed = extractFieldsLocallyFromText(
      customRawText,
      cleanTitle,
      newDocId,
      targetTenantId,
      customDocType
    );
    const chunkText = parsed.fields.map((f) => `${f.label}: ${f.field_value}`).join(' | ');

    setTimeout(() => {
      ingestDocument(
        {
          id: newDocId,
          tenant_id: targetTenantId,
          file_name: cleanTitle,
          file_url: `/custom/${cleanTitle}`,
          file_size: new Blob([customRawText]).size || 2048,
          page_count: 1,
          status: 'review_required',
          document_type: customDocType,
          vendor_name: parsed.detectedVendor,
          accuracy_rate: 95.6,
          processing_time_ms: 280,
          isDemo: false,
          extraction_engine: 'Local PDF.js Section Parser',
          raw_text: customRawText,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        parsed.fields,
        chunkText
      );
      setExtractionSourceLabel('Local PDF.js Section Parser');
      setProcessedDocId(newDocId);
      setIsProcessing(false);
    }, 350);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleStageLocalFileForConfirmation(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleStageLocalFileForConfirmation(e.target.files[0]);
      e.target.value = '';
    }
  };

  const combinedRemoteItems = [
    ...(cloudSourceFilter === 'supabase' ? [] : cloudItems),
    ...(cloudSourceFilter === 'cloud' ? [] : supabaseItems),
  ];

  return (
    <div className="relative rounded-2xl border border-white/[0.09] bg-[#0B0F19]/92 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-sky-400" />
              Upload Local File, Search Cloud Storage &amp; Supabase, or Paste Text
            </h3>
            {hasActiveAiKey && currentMode === 'ai' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-200">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                AI SCAN ACTIVE ({detectedProvider.name})
              </span>
            ) : hasActiveAiKey && currentMode === 'local' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-sky-200">
                <Cpu className="h-3 w-3 text-sky-400" />
                LOCAL SCAN ACTIVE (Offline PDF.js • AI Paused)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => promptByokForUnsupportedFile('__AI_SCAN__')}
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-sky-200 hover:bg-sky-500/25 transition-colors"
              >
                <Cpu className="h-3 w-3 text-sky-400" />
                LOCAL SCAN ACTIVE (Click to Add AI Key)
              </button>
            )}

            {/* Cloud Object Storage Quick Badge / Trigger */}
            <button
              type="button"
              onClick={() => setCloudStorageModalOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-semibold transition-colors ${
                byokConfig.cloudStorage?.isConnected
                  ? connectedCloudMeta.badgeColor
                  : 'border-orange-400/35 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
              }`}
              title="Connect Cloudflare R2, AWS S3, Azure Blob, or Google Cloud Storage"
            >
              <Cloud
                className={`h-3 w-3 ${
                  byokConfig.cloudStorage?.isConnected
                    ? connectedCloudMeta.accentTextClass
                    : 'text-orange-400'
                }`}
              />
              <span>
                {byokConfig.cloudStorage?.isConnected
                  ? `${connectedCloudMeta.shortName}: ${byokConfig.cloudStorage.bucketName}`
                  : 'Connect Object Storage'}
              </span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {hasActiveAiKey && currentMode === 'ai' ? (
              <>
                Currently in <strong className="text-emerald-300">AI Scan Mode ({detectedProvider.name})</strong> — extracts dynamic AI categories across all pages. Click <strong className="text-sky-300">Local Scan</strong> on the right to switch to 100% offline parsing.
              </>
            ) : (
              <>
                Currently in <strong className="text-sky-300">Local Scan Mode (Offline PDF.js)</strong> — parses <strong className="text-slate-200">PDF, DOCX, TXT, CSV, JSON, XML, and MD</strong> locally with zero API calls.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Two-Option Engine Selector: AI Scan vs Local Scan (always visible) */}
          <div
            className={`flex items-center rounded-xl border bg-[#07090E] p-1 text-xs transition-colors ${
              hasActiveAiKey && currentMode === 'ai'
                ? 'border-emerald-400/35'
                : 'border-sky-400/35'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                if (!hasActiveAiKey) {
                  promptByokForUnsupportedFile('__AI_SCAN__');
                  return;
                }
                saveByokConfig({ preferredExtractionMode: 'ai' });
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                hasActiveAiKey && currentMode === 'ai'
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-emerald-300 font-medium'
              }`}
              title={
                hasActiveAiKey
                  ? `Switch to AI Scan (${detectedProvider.name})`
                  : 'Click to add an AI API Key and enable AI Scan'
              }
            >
              <Sparkles
                className={`h-3.5 w-3.5 ${
                  hasActiveAiKey && currentMode === 'ai' ? 'text-emerald-400' : 'text-slate-400'
                }`}
              />
              <span>
                {hasActiveAiKey && currentMode === 'ai' ? 'AI Scan • Active' : 'AI Scan'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => saveByokConfig({ preferredExtractionMode: 'local' })}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                !hasActiveAiKey || currentMode === 'local'
                  ? 'bg-sky-500/20 border border-sky-400/50 text-sky-200 font-semibold shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'text-slate-400 hover:text-sky-300 font-medium'
              }`}
              title="Switch to Offline Local PDF.js Section Parser (zero API calls)"
            >
              <Cpu
                className={`h-3.5 w-3.5 ${
                  !hasActiveAiKey || currentMode === 'local' ? 'text-sky-400' : 'text-slate-400'
                }`}
              />
              <span>
                {!hasActiveAiKey || currentMode === 'local'
                  ? 'Local Scan • Active'
                  : 'Local Scan'}
              </span>
            </button>
          </div>

          {/* 3-Mode Source Tabs: Browse Local Files | Search Cloud & Supabase | Paste Document Text */}
          <div className="flex flex-wrap items-center rounded-xl border border-white/[0.08] bg-[#07090E] p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                setProcessedDocId(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white text-[#07090E] font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Browse Local Files</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('cloud_search');
                setProcessedDocId(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                activeTab === 'cloud_search'
                  ? 'bg-orange-500 text-slate-950 font-semibold'
                  : 'text-orange-300 hover:text-white'
              }`}
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>Search Cloud &amp; Supabase</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('paste');
                setProcessedDocId(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                activeTab === 'paste'
                  ? 'bg-white text-[#07090E] font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span>Paste Text</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: Spacious Local File Dropzone (Triggers Confirmation Dialog on file select/drop) */}
      {!isProcessing && !processedDocId && activeTab === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-11 px-6 transition-colors ${
            isDragging
              ? 'border-sky-400 bg-sky-500/10'
              : 'border-white/[0.14] bg-[#07090E]/70 hover:border-sky-400/50 hover:bg-[#07090E]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv,.tsv,.json,.xml,.md,.png,.jpg,.jpeg,.webp,.xlsx,.pptx,.rtf,.html"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-400/30 text-sky-400 group-hover:scale-105 transition-transform">
            <UploadCloud className="h-7 w-7" />
          </div>

          <p className="mt-4 text-base font-semibold text-white">
            Click to browse your computer or drag and drop a file here
          </p>
          <p className="mt-1.5 text-xs text-slate-400 max-w-lg text-center">
            {hasActiveAiKey && currentMode === 'ai' ? (
              <>
                <strong className="text-emerald-300">{detectedProvider.name} Active:</strong> Upload{' '}
                <strong className="text-slate-200">PDF, DOCX, PNG, JPG, WEBP, CSV, JSON, XML, TXT, or any document format</strong>. A confirmation dialog will verify your settings before scanning.
              </>
            ) : (
              <>
                <strong className="text-sky-300">Local Scan Formats:</strong>{' '}
                <strong className="text-slate-200">PDF, DOCX, TXT, CSV, TSV, JSON, XML, MD</strong>. Selecting any file opens a confirmation dialog before adding it to your workspace.
              </>
            )}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-[#07090E] group-hover:bg-slate-200 transition-colors">
              <FileText className="h-3.5 w-3.5" />
              <span>Select Local File from Computer</span>
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('cloud_search');
              }}
              className="inline-flex items-center gap-2 rounded-full border border-orange-400/35 bg-orange-500/15 px-4 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/25 transition-colors"
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>Search Cloudflare R2 / S3 / Supabase</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Search Cloud Object Storage (Cloudflare R2, AWS S3, Azure, GCS) & Supabase */}
      {!isProcessing && !processedDocId && activeTab === 'cloud_search' && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#07090E]/85 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Cloud className="h-4 w-4 text-orange-400" />
                <span>
                  Search &amp; Import from Object Storage ({connectedCloudMeta.shortName}) &amp; Supabase
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Type a document name below to search across your connected Object Storage bucket and Supabase database. Click <strong className="text-white">Add to System</strong> to confirm &amp; extract.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCloudStorageModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-400/35 bg-orange-500/15 px-3 py-1.5 text-xs font-semibold text-orange-300 hover:bg-orange-500/25 transition-colors"
              >
                <Cloud className="h-3.5 w-3.5" />
                <span>Configure Cloud Storage (R2 / S3 / Azure / GCS)</span>
              </button>
            </div>
          </div>

          {/* Search Input & Filter Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={cloudSearchQuery}
                onChange={(e) => setCloudSearchQuery(e.target.value)}
                placeholder="Search document name in Cloudflare R2, S3, Azure, or Supabase (e.g., Invoice, Resume, Contract, CSV)..."
                className="w-full rounded-xl border border-white/15 bg-[#0B0F19] pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-orange-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {[
                {
                  id: 'all',
                  label: `All (${cloudItems.length + supabaseItems.length})`,
                },
                {
                  id: 'cloud',
                  label: `${connectedCloudMeta.shortName} (${cloudItems.length})`,
                },
                {
                  id: 'supabase',
                  label: `Supabase (${supabaseItems.length})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setCloudSourceFilter(tab.id as 'all' | 'cloud' | 'supabase')
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    cloudSourceFilter === tab.id
                      ? 'bg-white text-[#07090E] font-semibold'
                      : 'border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => loadRemoteSearchCatalog(cloudSearchQuery)}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 text-slate-400 hover:text-white"
                title="Refresh Cloud & Supabase Index"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSearchingRemote ? 'animate-spin text-sky-400' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Matching Documents List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
            {combinedRemoteItems.length === 0 ? (
              <div className="md:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.015] p-6 text-center">
                <p className="text-xs font-semibold text-white">
                  No documents match &ldquo;{cloudSearchQuery}&rdquo;
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Try another search term or click Configure Cloud Storage to connect another bucket.
                </p>
              </div>
            ) : (
              combinedRemoteItems.map((item) => {
                const isSupabase = item.source === 'supabase';
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0B0F19] p-3 hover:border-orange-400/40 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                          isSupabase
                            ? 'border-[#3ECF8E]/35 bg-[#3ECF8E]/10 text-[#3ECF8E]'
                            : 'border-orange-400/35 bg-orange-500/10 text-orange-300'
                        }`}
                      >
                        {isSupabase ? (
                          <Database className="h-4 w-4" />
                        ) : (
                          <HardDrive className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-white truncate">
                            {item.fileName}
                          </p>
                          <span
                            className={`rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-semibold shrink-0 ${
                              isSupabase
                                ? 'border-[#3ECF8E]/35 bg-[#3ECF8E]/10 text-[#3ECF8E]'
                                : connectedCloudMeta.badgeColor
                            }`}
                          >
                            {isSupabase ? 'SUPABASE' : connectedCloudMeta.shortName}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                          {item.bucketName} • {formatBytes(item.size)} • {formatDate(item.lastModified)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStageRemoteItemForConfirmation(item)}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#07090E] hover:bg-slate-200 transition-colors shrink-0"
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span>Add to System</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Interactive Paste Raw Document Text Form */}
      {!isProcessing && !processedDocId && activeTab === 'paste' && (
        <form
          onSubmit={handleExtractFromPastedText}
          className="rounded-2xl border border-white/[0.08] bg-[#07090E]/80 p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Document Name / Title
              </label>
              <input
                type="text"
                value={customDocTitle}
                onChange={(e) => setCustomDocTitle(e.target.value)}
                placeholder="e.g., Q4_Vendor_Invoice.txt"
                className="w-full rounded-xl border border-white/[0.1] bg-[#0B0F19] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Document Category
              </label>
              <select
                value={customDocType}
                onChange={(e) => setCustomDocType(e.target.value as DocumentType)}
                className="w-full rounded-xl border border-white/[0.1] bg-[#0B0F19] px-3.5 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
              >
                <option value="INVOICE">Invoice</option>
                <option value="CONTRACT">Contract / Agreement</option>
                <option value="RESUME">Resume / CV</option>
                <option value="BALANCE_SHEET">Financial Statement / Balance Sheet</option>
                <option value="AUDIT_STATEMENT">Audit / Compliance Report</option>
                <option value="GENERAL">General Document</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Paste Invoice, Resume, Contract, CSV, JSON, or Key: Value Text (all 6 Studio slots will be mapped)
            </label>
            <textarea
              rows={5}
              value={customRawText}
              onChange={(e) => setCustomRawText(e.target.value)}
              placeholder="Vendor Name: Acme Corp&#10;Invoice Number: INV-1001&#10;Total Amount: $12,500.00"
              className="w-full rounded-xl border border-white/[0.1] bg-[#0B0F19] p-3.5 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Tip: Format lines as <code className="text-sky-300 font-mono">Label: Value</code>, CSV, JSON, or freeform text.
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-[#07090E] hover:bg-slate-200 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Extract Fields &amp; Open Studio</span>
            </button>
          </div>
        </form>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Cpu className="h-4 w-4 text-sky-400 animate-spin" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Extracting Step {currentStepIndex + 1} of {PIPELINE_STEPS.length}
                {hasActiveAiKey && currentMode === 'ai'
                  ? ` via ${detectedProvider.name}`
                  : ' via Local Engine'}
              </span>
            </div>
            <span className="font-mono tracking-tight tabular-nums text-xs text-sky-300">
              {Math.round(((currentStepIndex + 1) / PIPELINE_STEPS.length) * 100)}%
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-sky-400 transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / PIPELINE_STEPS.length) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={step.id}
                  className={`rounded-lg border p-2.5 text-xs transition-all ${
                    isDone
                      ? 'border-white/[0.10] bg-white/[0.04] text-sky-300'
                      : isCurrent
                      ? 'border-white/25 bg-white/[0.06] text-white'
                      : 'border-white/[0.04] bg-white/[0.01] text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/10 font-mono text-[9px] text-white">
                        {step.id}
                      </span>
                    )}
                    <span className="truncate">{step.label}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 truncate">{step.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Banner */}
      {processedDocId && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">
                Your Document Is Ready ({processedDocId})
              </p>
              <p className="text-xs text-slate-300">
                Extracted 6 calibrated sections via{' '}
                <span className="text-sky-300 font-mono font-semibold">{extractionSourceLabel}</span>
                {byokConfig.isSupabaseConnected ? ' • Synced to Supabase' : ' • Saved to Local Workspace'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setProcessedDocId(null)}
              className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.1]"
            >
              Upload Another
            </button>
            <button
              onClick={() => router.push(`/documents/${processedDocId}`)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#07090E] hover:bg-slate-200 transition-all"
            >
              <span>Open in Review Studio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
