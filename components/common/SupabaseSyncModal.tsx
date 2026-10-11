'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Copy,
  Check,
  Code2,
} from 'lucide-react';

export function SupabaseLogo({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 109 113"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z"
        fill="#249361"
      />
      <path
        d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z"
        fill="#3ECF8E"
      />
    </svg>
  );
}

const QUICKSTART_SQL_SCHEMA = `-- Run in your Supabase SQL Editor to enable instant AetherDoc sync:
create table if not exists public.documents (
  id text primary key,
  tenant_id text not null default 'a0000000-0000-0000-0000-000000000001',
  title text not null default 'Untitled Document',
  file_name text not null default 'Untitled Document',
  file_url text default '/uploads/local.pdf',
  file_size bigint default 120000,
  document_type text not null default 'INVOICE',
  vendor_name text default 'Enterprise Entity',
  status text not null default 'review_required',
  page_count integer not null default 1,
  storage_path text default '/uploads/local.pdf',
  accuracy_rate numeric default 98.5,
  overall_confidence numeric default 0.985,
  processing_time_ms integer default 420,
  extraction_engine text default 'Local PDF.js Section Parser',
  raw_text text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.documents add column if not exists title text default 'Untitled Document';
alter table public.documents add column if not exists file_name text default 'Untitled Document';
alter table public.documents add column if not exists file_url text default '/uploads/local.pdf';
alter table public.documents add column if not exists file_size bigint default 120000;
alter table public.documents add column if not exists vendor_name text default 'Enterprise Entity';
alter table public.documents add column if not exists accuracy_rate numeric default 98.5;
alter table public.documents add column if not exists overall_confidence numeric default 0.985;
alter table public.documents add column if not exists processing_time_ms integer default 420;
alter table public.documents add column if not exists extraction_engine text default 'Local PDF.js Section Parser';
alter table public.documents add column if not exists raw_text text default '';

create table if not exists public.extracted_fields (
  id text primary key,
  document_id text references public.documents(id) on delete cascade,
  tenant_id text not null default 'a0000000-0000-0000-0000-000000000001',
  field_key text not null,
  label text not null default 'Extracted Field',
  field_label text not null default 'Extracted Field',
  field_value text not null default '',
  category text default 'Extracted Details',
  confidence numeric not null default 0.95,
  page_number integer not null default 1,
  bbox jsonb not null default '{"x":0.06,"y":0.12,"w":0.88,"h":0.14}',
  status text not null default 'verified',
  audited_by text,
  verified_by text,
  verified_at timestamptz
);

alter table public.extracted_fields add column if not exists label text default 'Extracted Field';
alter table public.extracted_fields add column if not exists field_label text default 'Extracted Field';
alter table public.extracted_fields add column if not exists category text default 'Extracted Details';
alter table public.extracted_fields add column if not exists bbox jsonb default '{"x":0.06,"y":0.12,"w":0.88,"h":0.14}';
alter table public.extracted_fields add column if not exists audited_by text;

alter table public.documents enable row level security;
alter table public.extracted_fields enable row level security;

drop policy if exists "Allow anon access to documents" on public.documents;
create policy "Allow anon access to documents" on public.documents
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow anon access to extracted_fields" on public.extracted_fields;
create policy "Allow anon access to extracted_fields" on public.extracted_fields
  for all to anon, authenticated using (true) with check (true);`;

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupabaseSyncModal({ isOpen, onClose }: SupabaseSyncModalProps) {
  const { byokConfig, saveByokConfig, syncWithSupabase, documents } = useAppStore();

  const [supabaseUrl, setSupabaseUrl] = useState(byokConfig.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(byokConfig.supabaseAnonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSchemaSql, setShowSchemaSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSupabaseUrl(byokConfig.supabaseUrl || '');
      setSupabaseAnonKey(byokConfig.supabaseAnonKey || '');
      setStatusMessage(null);
    }
  }, [isOpen, byokConfig]);

  if (!isOpen) return null;

  const isConfigured = Boolean(supabaseUrl.trim() && supabaseAnonKey.trim());
  const userUploadedCount = documents.filter((d) => !d.isDemo).length;

  const handleTestConnection = async () => {
    const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    const cleanKey = supabaseAnonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setStatusMessage({
        type: 'info',
        text: 'Enter your Supabase Project URL and Anon Key to connect.',
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`${cleanUrl}/rest/v1/`, {
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
        },
      });
      if (res.ok) {
        saveByokConfig({
          supabaseUrl: cleanUrl,
          supabaseAnonKey: cleanKey,
        });
        setStatusMessage({
          type: 'success',
          text: 'Supabase REST API verified and saved! Ready to Pull or Push documents.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Supabase responded with HTTP ${res.status}. Check your Anon Public Key.`,
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Could not reach Supabase URL. Verify https://<project-ref>.supabase.co',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async (direction: 'both' | 'pull' | 'push') => {
    const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    const cleanKey = supabaseAnonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setStatusMessage({
        type: 'error',
        text: 'Please provide both your Supabase URL and Anon Key before syncing.',
      });
      return;
    }

    // Ensure saved in store before calling syncWithSupabase
    saveByokConfig({
      supabaseUrl: cleanUrl,
      supabaseAnonKey: cleanKey,
    });

    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const result = await syncWithSupabase(direction);
      setStatusMessage({
        type: result.ok ? 'success' : 'error',
        text: result.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveByokConfig({
      supabaseUrl: supabaseUrl.trim().replace(/\/$/, ''),
      supabaseAnonKey: supabaseAnonKey.trim(),
    });
    setStatusMessage({
      type: 'success',
      text: isConfigured
        ? 'Supabase connection saved. New document uploads will sync automatically.'
        : 'Switched to Local Browser Storage.',
    });
  };

  const handleDisconnect = () => {
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    saveByokConfig({
      supabaseUrl: '',
      supabaseAnonKey: '',
    });
    setStatusMessage({
      type: 'info',
      text: 'Disconnected from Supabase. Documents remain safely stored in your browser.',
    });
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(QUICKSTART_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-[#3ECF8E]/30 bg-[#0B0F19] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.75)]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.07] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3ECF8E]/10 border border-[#3ECF8E]/30">
              <SupabaseLogo className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Supabase Cloud Database Sync
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono ${
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
                  {byokConfig.isSupabaseConnected ? 'Connected' : 'Local Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pull existing documents from your Supabase project or push local uploads to PostgreSQL.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* Credentials Box */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project-ref.supabase.co"
                className="w-full rounded-xl border border-white/[0.1] bg-[#07090E] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#3ECF8E] focus:outline-none font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono text-slate-300">
                  Supabase Anon / Public Key
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Project Settings → API → anon public
                </span>
              </div>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full rounded-xl border border-white/[0.1] bg-[#07090E] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#3ECF8E] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Direct Cloud Sync Actions */}
          <div className="rounded-xl border border-[#3ECF8E]/20 bg-[#3ECF8E]/[0.04] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                Two-Way PostgreSQL Document Sync
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {userUploadedCount} user {userUploadedCount === 1 ? 'document' : 'documents'} ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isSyncing || !isConfigured}
                onClick={() => handleSync('pull')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#07090E]/90 px-3 py-2 text-xs font-medium text-slate-200 hover:border-[#3ECF8E]/50 hover:text-white transition-colors disabled:opacity-40"
              >
                <ArrowDownToLine className="h-3.5 w-3.5 text-[#3ECF8E]" />
                <span>Pull from DB</span>
              </button>

              <button
                type="button"
                disabled={isSyncing || !isConfigured}
                onClick={() => handleSync('push')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#07090E]/90 px-3 py-2 text-xs font-medium text-slate-200 hover:border-[#3ECF8E]/50 hover:text-white transition-colors disabled:opacity-40"
              >
                <ArrowUpFromLine className="h-3.5 w-3.5 text-[#3ECF8E]" />
                <span>Push Local Docs</span>
              </button>

              <button
                type="button"
                disabled={isSyncing || !isConfigured}
                onClick={() => handleSync('both')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#3ECF8E]/40 bg-[#3ECF8E]/15 px-3 py-2 text-xs font-semibold text-[#3ECF8E] hover:bg-[#3ECF8E]/25 transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Both Ways</span>
              </button>
            </div>
          </div>

          {/* Quickstart SQL Schema Helper */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSchemaSql((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                <Code2 className="h-3.5 w-3.5 text-[#3ECF8E]" />
                <span>Need the Supabase tables? View or copy Quickstart SQL</span>
              </button>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-mono text-slate-200 hover:bg-white/[0.08] transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check className="h-3 w-3 text-[#3ECF8E]" />
                    <span className="text-[#3ECF8E]">Copied SQL</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-slate-400" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            {showSchemaSql && (
              <pre className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-white/[0.06] bg-[#05070B] p-3 text-[10px] font-mono text-slate-300 leading-relaxed">
                {QUICKSTART_SQL_SCHEMA}
              </pre>
            )}
          </div>

          {statusMessage && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                statusMessage.type === 'success'
                  ? 'border-[#3ECF8E]/30 bg-[#3ECF8E]/10 text-[#3ECF8E]'
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

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
              >
                {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Test Connection</span>
              </button>

              {isConfigured && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-300 hover:bg-rose-500/20 transition-colors"
                  title="Disconnect Supabase"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#3ECF8E] px-5 py-2 text-xs font-semibold text-[#07090E] hover:bg-[#34b87c] transition-colors shadow-[0_0_20px_rgba(62,207,142,0.25)]"
              >
                <SupabaseLogo className="h-3.5 w-3.5" />
                <span>Save Supabase</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
