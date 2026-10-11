'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  detectAiProviderFromKey,
  discoverAvailableGeminiModels,
  getActiveKeyFromConfig,
  sanitizeAndExtractApiKey,
  LOCAL_SUPPORTED_LABEL,
} from '@/lib/extraction/universalExtractor';
import {
  X,
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Cpu,
  FileWarning,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ByokModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ByokModal({ isOpen, onClose }: ByokModalProps) {
  const {
    byokConfig,
    byokPromptFileName,
    promptByokForUnsupportedFile,
    saveByokConfig,
  } = useAppStore();

  const shouldRender = isOpen || Boolean(byokPromptFileName);

  const [universalKey, setUniversalKey] = useState(getActiveKeyFromConfig(byokConfig));
  const [showKeyText, setShowKeyText] = useState(false);
  const [extractionMode, setExtractionMode] = useState<'ai' | 'local'>(
    byokConfig.preferredExtractionMode || 'ai'
  );
  const [discoveredModel, setDiscoveredModel] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (shouldRender) {
      const currentKey = getActiveKeyFromConfig(byokConfig);
      setUniversalKey(currentKey);
      setExtractionMode(
        currentKey ? byokConfig.preferredExtractionMode || 'ai' : 'local'
      );
      setStatusMessage(null);
    }
  }, [shouldRender, byokConfig]);

  const cleanKey = sanitizeAndExtractApiKey(universalKey);
  const detected = detectAiProviderFromKey(cleanKey);

  if (!shouldRender) return null;

  const handleCloseModal = () => {
    promptByokForUnsupportedFile(null);
    onClose();
  };

  const handleVerifyKey = async () => {
    setIsTesting(true);
    setStatusMessage(null);

    if (!cleanKey) {
      setIsTesting(false);
      setStatusMessage({
        type: 'info',
        text: 'Local Engine active (supports PDF, DOCX, TXT, CSV, JSON, MD). Paste an AI key to unlock all formats.',
      });
      return;
    }

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          provider: detected.id,
          apiKey: cleanKey,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        const activeModel = data.model || detected.model;
        setDiscoveredModel(activeModel);
        setStatusMessage({
          type: 'success',
          text: `${detected.name} verified! Active model: ${activeModel}`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data?.error || `${detected.name} API key rejected.`,
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Network error while verifying key. Check your internet connection or key.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenMode: 'ai' | 'local' = cleanKey ? extractionMode : 'local';

    saveByokConfig({
      geminiApiKey: detected.id === 'gemini' ? cleanKey : '',
      openaiApiKey:
        detected.id !== 'gemini' && detected.id !== 'local' ? cleanKey : '',
      llmProvider: detected.id === 'gemini' ? 'gemini' : 'openai',
      llmApiKey: cleanKey,
      detectedProviderName: cleanKey ? detected.shortLabel : '',
      preferredExtractionMode: chosenMode,
    });

    setStatusMessage({
      type: 'success',
      text: cleanKey
        ? `Connected ${detected.name} (${
            chosenMode === 'ai' ? 'AI Cloud Extraction Active' : 'Local Engine Selected'
          }).`
        : 'Using Local Document Parser (PDF, DOCX, TXT, CSV, JSON, MD).',
    });

    setTimeout(() => {
      handleCloseModal();
    }, 450);
  };

  const handleClear = () => {
    setUniversalKey('');
    setDiscoveredModel('');
    setExtractionMode('local');
    saveByokConfig({
      geminiApiKey: '',
      openaiApiKey: '',
      llmApiKey: '',
      detectedProviderName: '',
      preferredExtractionMode: 'local',
    });
    setStatusMessage({
      type: 'info',
      text: 'Cleared AI API key. Switched to Local Document Parser.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#0B0F19] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.07] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-400/25 text-sky-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                AI Document Intelligence &amp; API Key Setup
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste any AI API key to auto-detect your provider and unlock universal format extraction.
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Alert Banner when triggered by clicking AI Scan without a key, or uploading an unsupported local file format */}
        {byokPromptFileName === '__AI_SCAN__' ? (
          <div className="mt-4 rounded-xl border border-sky-400/35 bg-sky-500/10 p-3.5 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-100 leading-relaxed">
              <p className="font-semibold text-white">
                API Key Required for AI Scan
              </p>
              <p className="mt-1 text-sky-200/90">
                Add your AI API key below (Google Gemini, OpenAI, Claude, or Groq) to enable{' '}
                <span className="font-semibold text-white">AI Scan</span> across all documents.
              </p>
            </div>
          </div>
        ) : byokPromptFileName ? (
          <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3.5 flex items-start gap-3">
            <FileWarning className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 leading-relaxed">
              <p className="font-semibold text-white">
                AI API Key Required to Analyze &ldquo;{byokPromptFileName}&rdquo;
              </p>
              <p className="mt-1 text-amber-200/90">
                For local scan without an API key, only{' '}
                <span className="font-mono font-semibold text-white">
                  {LOCAL_SUPPORTED_LABEL}
                </span>{' '}
                files are supported. Connect an AI API key below so AI can analyze this format.
              </p>
            </div>
          </div>
        ) : null}

        {/* Format Capability Notice */}
        <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-slate-300 flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-white">Local Scan Allowed Formats:</span>{' '}
            <span className="font-mono text-sky-300">PDF, DOCX, TXT, CSV, JSON, MD</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Connect an AI API key below to extract <strong className="text-slate-200">any file format</strong> (images, scans, spreadsheets, etc.).
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Universal Single Input */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-white">
                Paste Your AI API Key
              </label>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-semibold ${detected.badgeColor}`}
              >
                <Cpu className="h-3 w-3" />
                {detected.name}
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                type={showKeyText ? 'text' : 'password'}
                value={universalKey}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text');
                  const sanitized = sanitizeAndExtractApiKey(pasted);
                  setUniversalKey(sanitized);
                  setDiscoveredModel('');
                  if (sanitized) {
                    setExtractionMode('ai');
                  }
                }}
                onChange={(e) => {
                  const nextVal = sanitizeAndExtractApiKey(e.target.value);
                  setUniversalKey(nextVal);
                  setDiscoveredModel('');
                  if (nextVal) {
                    setExtractionMode('ai');
                  }
                }}
                placeholder="Paste AIzaSy... (Gemini), sk-... (OpenAI), sk-ant-... (Claude), or gsk_... (Groq)"
                className="w-full rounded-xl border border-white/[0.1] bg-[#07090E] pl-3.5 pr-16 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {universalKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setUniversalKey('');
                      setDiscoveredModel('');
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                    title="Clear input"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowKeyText((prev) => !prev)}
                  className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  title={showKeyText ? 'Hide key' : 'Show key'}
                >
                  {showKeyText ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Instant Detected AI Provider Showcase Card */}
            {cleanKey ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>Detected Provider:</span>
                      <span className="text-emerald-300 font-mono">{detected.name}</span>
                    </p>
                    <p className="text-[11px] text-slate-300 font-mono">
                      Active Model: <span className="text-sky-300">{discoveredModel || detected.model}</span>
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-400/20 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-300 shrink-0">
                  All Formats Unlocked
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  Auto-detects: <strong className="text-slate-300">Google Gemini (AIza...)</strong>,{' '}
                  <strong className="text-slate-300">OpenAI (sk-...)</strong>,{' '}
                  <strong className="text-slate-300">Claude</strong>,{' '}
                  <strong className="text-slate-300">Groq</strong>
                </span>
              </div>
            )}

            {/* Two-Option Engine Selector when an AI API Key is present */}
            {cleanKey && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  Select Extraction Mode (2 Options Available)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExtractionMode('ai')}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                      extractionMode === 'ai'
                        ? 'border-sky-400 bg-sky-500/15 text-white'
                        : 'border-white/[0.08] bg-[#07090E]/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                      1. AI Scan
                    </span>
                    <span className="text-[10px] text-slate-300 mt-0.5">
                      Handles any file format with live AI intelligence
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtractionMode('local')}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                      extractionMode === 'local'
                        ? 'border-sky-400 bg-sky-500/15 text-white'
                        : 'border-white/[0.08] bg-[#07090E]/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                      2. Local Engine Scan
                    </span>
                    <span className="text-[10px] text-slate-300 mt-0.5">
                      Offline scan for PDF, DOCX, TXT, CSV, JSON, MD
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Feedback */}
          {statusMessage && (
            <div
              className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${
                statusMessage.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.07]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleVerifyKey}
                disabled={isTesting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
              >
                {isTesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                )}
                <span>Test Key &amp; Discover Model</span>
              </button>

              {cleanKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-xl px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-[#07090E] hover:bg-slate-200 transition-colors"
              >
                Save &amp; Apply
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
