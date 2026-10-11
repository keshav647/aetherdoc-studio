'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  sanitizeAndExtractApiKey,
  detectAiProviderFromKey,
} from '@/lib/extraction/universalExtractor';
import { SupabaseLogo } from '@/components/common/SupabaseSyncModal';
import {
  KeyRound,
  Sliders,
  CheckCircle2,
  Download,
  RotateCcw,
  Building2,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Eye,
  EyeOff,
  Trash2,
  HardDrive,
} from 'lucide-react';

export default function SettingsPage() {
  const {
    activeTenant,
    thresholds,
    updateThresholds,
    byokConfig,
    saveByokConfig,
    syncWithSupabase,
    hideDemoSamples,
    toggleHideDemoSamples,
    restoreDemoSamples,
    clearUploadedDocumentsMemory,
    clearAllWebsiteMemory,
    memoryStats,
    resetWorkspace,
    documents,
    fieldsByDoc,
  } = useAppStore();

  const [supabaseUrl, setSupabaseUrl] = useState(byokConfig.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(byokConfig.supabaseAnonKey || '');
  const [aiKey, setAiKey] = useState(
    byokConfig.geminiApiKey || byokConfig.openaiApiKey || byokConfig.llmApiKey || ''
  );

  // Sync local input states once client-side localStorage hydration completes
  useEffect(() => {
    setSupabaseUrl(byokConfig.supabaseUrl || '');
    setSupabaseAnonKey(byokConfig.supabaseAnonKey || '');
    setAiKey(byokConfig.geminiApiKey || byokConfig.openaiApiKey || byokConfig.llmApiKey || '');
  }, [
    byokConfig.supabaseUrl,
    byokConfig.supabaseAnonKey,
    byokConfig.geminiApiKey,
    byokConfig.openaiApiKey,
    byokConfig.llmApiKey,
  ]);

  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    saveByokConfig({
      supabaseUrl: supabaseUrl.trim().replace(/\/$/, ''),
      supabaseAnonKey: supabaseAnonKey.trim(),
    });
    setSavedSuccess('Supabase database credentials saved!');
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  const handleSync = async (direction: 'both' | 'pull' | 'push') => {
    saveByokConfig({
      supabaseUrl: supabaseUrl.trim().replace(/\/$/, ''),
      supabaseAnonKey: supabaseAnonKey.trim(),
    });
    setIsSyncing(true);
    setSyncMessage(null);
    const res = await syncWithSupabase(direction);
    setSyncMessage(res.message);
    setIsSyncing(false);
  };

  const handleSaveAiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeAndExtractApiKey(aiKey);
    const detected = detectAiProviderFromKey(cleaned);
    setAiKey(cleaned);
    saveByokConfig({
      geminiApiKey: detected.id === 'gemini' ? cleaned : '',
      openaiApiKey: detected.id !== 'gemini' && detected.id !== 'local' ? cleaned : '',
      llmProvider: detected.id === 'gemini' ? 'gemini' : 'openai',
      llmApiKey: cleaned,
      detectedProviderName: cleaned ? detected.shortLabel : '',
      preferredExtractionMode: cleaned ? 'ai' : 'local',
    });
    setSavedSuccess(
      cleaned
        ? `AI API key saved (${detected.name} • ${detected.model})!`
        : 'Switched to Local PDF.js Engine.'
    );
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  const handleExportWorkspace = () => {
    const snapshot = {
      exported_at: new Date().toISOString(),
      tenant: activeTenant,
      thresholds,
      documents,
      fieldsByDoc,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = 'aetherdoc_workspace_snapshot.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const demoCount = documents.filter((d) => d.isDemo).length;

  return (
    <div className="space-y-7 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white font-editorial sm:text-3xl">
          Workspace, Supabase &amp; AI Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure your standalone Supabase database sync, connect any AI API key, or manage demo sample visibility.
        </p>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {/* Section 1: Dedicated Official Supabase Cloud Database Card (#3ECF8E) */}
      <div className="relative rounded-2xl border border-[#3ECF8E]/35 bg-[#0B0F19]/95 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.45)] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3ECF8E]/12 border border-[#3ECF8E]/35">
              <SupabaseLogo className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Supabase Cloud Database Connection
              </h2>
              <p className="text-xs text-slate-400">
                Pull existing documents from your Supabase project or push local uploads to PostgreSQL.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono ${
              byokConfig.isSupabaseConnected
                ? 'border-[#3ECF8E]/40 bg-[#3ECF8E]/15 text-[#3ECF8E]'
                : 'border-white/10 bg-white/[0.04] text-slate-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                byokConfig.isSupabaseConnected ? 'bg-[#3ECF8E]' : 'bg-slate-400'
              }`}
            />
            {byokConfig.isSupabaseConnected ? 'Connected' : 'Local Browser Mode'}
          </span>
        </div>

        <form onSubmit={handleSaveSupabase} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full rounded-xl border border-white/[0.1] bg-[#07090E] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-[#3ECF8E] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Supabase Anon Public Key
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full rounded-xl border border-white/[0.1] bg-[#07090E] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-[#3ECF8E] focus:outline-none font-mono"
              />
            </div>
          </div>

          {syncMessage && (
            <p className="text-xs text-[#3ECF8E] font-mono">{syncMessage}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSyncing || !supabaseUrl.trim() || !supabaseAnonKey.trim()}
                onClick={() => handleSync('pull')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#07090E] px-3 py-2 text-xs font-medium text-slate-200 hover:border-[#3ECF8E]/50 hover:text-white transition-colors disabled:opacity-40"
              >
                <ArrowDownToLine className="h-3.5 w-3.5 text-[#3ECF8E]" />
                <span>Pull from DB</span>
              </button>

              <button
                type="button"
                disabled={isSyncing || !supabaseUrl.trim() || !supabaseAnonKey.trim()}
                onClick={() => handleSync('push')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#07090E] px-3 py-2 text-xs font-medium text-slate-200 hover:border-[#3ECF8E]/50 hover:text-white transition-colors disabled:opacity-40"
              >
                <ArrowUpFromLine className="h-3.5 w-3.5 text-[#3ECF8E]" />
                <span>Push Local Docs</span>
              </button>

              <button
                type="button"
                disabled={isSyncing || !supabaseUrl.trim() || !supabaseAnonKey.trim()}
                onClick={() => handleSync('both')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#3ECF8E]/40 bg-[#3ECF8E]/15 px-3 py-2 text-xs font-semibold text-[#3ECF8E] hover:bg-[#3ECF8E]/25 transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Both Ways</span>
              </button>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#3ECF8E] px-5 py-2 text-xs font-semibold text-[#07090E] hover:bg-[#34b87c] transition-all"
            >
              <SupabaseLogo className="h-3.5 w-3.5" />
              <span>Save Supabase</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Universal AI API Key (Auto-Detect) */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-sky-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Universal AI API Key (Auto-Detect)
              </h2>
              <p className="text-xs text-slate-400">
                Optional: Paste a Gemini, OpenAI, Claude, Groq, Grok, or OpenRouter key for live AI extraction.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveAiKey} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              AI Provider API Key
            </label>
            <input
              type="password"
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              placeholder="Paste Gemini (AIza...), OpenAI (sk-...), Claude (sk-ant...), or Groq (gsk_...)"
              className="w-full rounded-xl border border-white/[0.1] bg-[#07090E] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Stored locally in your browser and never sent to third-party servers.
            </span>
            <button
              type="submit"
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-[#07090E] hover:bg-slate-200 transition-all"
            >
              Save AI Key
            </button>
          </div>
        </form>
      </div>

      {/* Section 3: Confidence & Review Thresholds */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-5">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-sky-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Confidence &amp; Review Thresholds
            </h2>
            <p className="text-xs text-slate-400">
              Adjust how extracted fields are marked as Verified or Flagged for Review.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-200">High Confidence Target</span>
              <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                {Math.round(thresholds.highConfidence * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={80}
              max={99}
              value={Math.round(thresholds.highConfidence * 100)}
              onChange={(e) =>
                updateThresholds({ highConfidence: Number(e.target.value) / 100 })
              }
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-200">Flag for Review Below</span>
              <span className="font-mono font-semibold text-rose-400 tabular-nums">
                {Math.round(thresholds.anomalyThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={85}
              value={Math.round(thresholds.anomalyThreshold * 100)}
              onChange={(e) =>
                updateThresholds({ anomalyThreshold: Number(e.target.value) / 100 })
              }
              className="w-full accent-rose-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Website Memory & Browser Storage Manager */}
      <div className="relative rounded-2xl border border-rose-500/30 bg-[#0B0F19]/95 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/12 border border-rose-500/30 text-rose-400">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Website Memory &amp; Browser Storage Manager
              </h2>
              <p className="text-xs text-slate-400">
                Inspect live browser memory usage and clear uploaded documents, cached extractions, localStorage, sessionStorage, and AI model caches directly.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-mono font-semibold text-rose-300 tabular-nums">
            {memoryStats.formattedSize} Used
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Memory Footprint
            </span>
            <span className="text-base font-mono font-semibold text-white tabular-nums mt-0.5 block">
              {memoryStats.formattedSize}
            </span>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Uploaded Docs
            </span>
            <span className="text-base font-mono font-semibold text-sky-300 tabular-nums mt-0.5 block">
              {memoryStats.uploadedDocsCount}
            </span>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Cached Fields
            </span>
            <span className="text-base font-mono font-semibold text-emerald-300 tabular-nums mt-0.5 block">
              {memoryStats.totalFieldsCount}
            </span>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Search Chunks
            </span>
            <span className="text-base font-mono font-semibold text-amber-300 tabular-nums mt-0.5 block">
              {memoryStats.totalChunksCount}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              clearUploadedDocumentsMemory();
              setSavedSuccess(
                'Cleared all uploaded documents, extracted fields, and search chunks from memory!'
              );
              setTimeout(() => setSavedSuccess(null), 3500);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-white transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>Clear Uploaded Documents ({memoryStats.uploadedDocsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              clearAllWebsiteMemory({ keepCredentials: true, keepDemos: false });
              setSavedSuccess(
                'All website memory, cached documents, localStorage, sessionStorage, and AI model caches cleared (API keys kept)!'
              );
              setTimeout(() => setSavedSuccess(null), 3500);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 hover:text-white transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>Clear All Website Memory (Keep Keys)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              clearAllWebsiteMemory({ keepCredentials: false, keepDemos: false });
              setSupabaseUrl('');
              setSupabaseAnonKey('');
              setAiKey('');
              setSavedSuccess(
                'Full factory wipe complete: all website memory, cached documents, and saved credentials cleared!'
              );
              setTimeout(() => setSavedSuccess(null), 3500);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-600/20 px-3.5 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-600/35 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-300" />
            <span>Full Factory Wipe (Memory + Keys)</span>
          </button>
        </div>
      </div>

      {/* Section 5: Demo Sample Visibility & Workspace Export */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-sky-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Demo Samples &amp; Data Export
              </h2>
              <p className="text-xs text-slate-400">
                Hide or restore the 2 demo sample documents, export your data as JSON, or reset the workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {demoCount > 0 ? (
              <button
                onClick={toggleHideDemoSamples}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08] transition-colors"
              >
                {hideDemoSamples ? (
                  <>
                    <Eye className="h-3.5 w-3.5 text-sky-400" />
                    <span>Show Demo Samples</span>
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
                onClick={restoreDemoSamples}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 text-sky-400" />
                <span>Restore 2 Demo Samples</span>
              </button>
            )}

            <button
              onClick={handleExportWorkspace}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08] transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-sky-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={resetWorkspace}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-amber-300 hover:bg-white/[0.08] transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
