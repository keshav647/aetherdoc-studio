'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import {
  Search,
  Sparkles,
  ArrowRight,
  FileText,
  Tag,
  BookOpen,
  Crosshair,
  UploadCloud,
  Trash2,
} from 'lucide-react';

const SUGGESTED_QUERIES = [
  'NVIDIA H200 SXM',
  'INV-2026-8941',
  'Liability Cap $5,000,000',
  'Apex Global',
  'SWIFT UBSWCHZH80A',
];

export default function HybridSearchPage() {
  const router = useRouter();
  const { searchHybrid, documents, fieldsByDoc, chunks, deleteDocument } = useAppStore();

  const [query, setQuery] = useState('NVIDIA H200 SXM');
  const [activeQuery, setActiveQuery] = useState('NVIDIA H200 SXM');

  const results = activeQuery
    ? searchHybrid(activeQuery)
    : {
        documents: documents.slice(0, 2),
        matchedFields: Object.values(fieldsByDoc).flat().slice(0, 4),
        chunks: chunks.slice(0, 3),
      };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setActiveQuery(searchQuery);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white font-editorial sm:text-3xl">
            Smart Document &amp; Field Search
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search across your uploaded documents and extracted fields. Click any result to jump straight to its highlighted box in the Review Studio.
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 hover:text-white transition-colors shrink-0"
        >
          <UploadCloud className="h-3.5 w-3.5" />
          <span>+ Upload Document to Index</span>
        </button>
      </div>

      {/* Search Input Box */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="relative"
        >
          <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor name, invoice number, dollar total, or contract clause..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveQuery(e.target.value);
            }}
            className="w-full rounded-xl border border-white/[0.08] bg-black/50 pl-11 pr-32 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-400/50 focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#07090E] hover:bg-slate-200 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Suggested Queries */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <Sparkles className="h-3 w-3 text-sky-400" />
            Try searching:
          </span>
          {SUGGESTED_QUERIES.map((preset) => {
            const isSelected = activeQuery.toLowerCase() === preset.toLowerCase();
            return (
              <button
                key={preset}
                onClick={() => handleSearch(preset)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-mono transition-colors ${
                  isSelected
                    ? 'border-white/25 bg-white/[0.08] text-white'
                    : 'border-white/[0.07] bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results View */}
      <div className="space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono tracking-tight tabular-nums">
          <span>
            Showing matches for{' '}
            <span className="text-white">&quot;{activeQuery || 'All Documents'}&quot;</span>
          </span>
          <span className="text-emerald-400">
            {results.matchedFields.length} fields • {results.documents.length} documents
          </span>
        </div>

        {/* Matched Extracted Fields */}
        {results.matchedFields.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Matched Fields ({results.matchedFields.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.matchedFields.map((f) => (
                <div
                  key={f.id}
                  onClick={() => router.push(`/documents/${f.document_id}?field=${f.id}`)}
                  className="cursor-pointer rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-4 hover:border-sky-400/40 hover:bg-[#0E1422] transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                      <span className="text-xs font-semibold text-white">{f.label}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] tracking-tight tabular-nums text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {(f.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="font-mono text-xs text-sky-200 tracking-tight tabular-nums">
                    {f.field_value}
                  </p>

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-[10px] font-mono tracking-tight tabular-nums text-slate-400">
                    <span className="flex items-center gap-1">
                      <Crosshair className="h-3 w-3 text-slate-500" />
                      Page {f.page_number}
                    </span>
                    <span className="text-sky-400 flex items-center gap-1">
                      Open Highlighted Box <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matched Documents */}
        {results.documents.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Matched Documents ({results.documents.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="cursor-pointer rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-4 hover:border-sky-400/40 hover:bg-[#0E1422] transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sky-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white text-xs">{doc.file_name}</p>
                        {doc.isDemo ? (
                          <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
                            DEMO
                          </span>
                        ) : (
                          <span className="rounded-full border border-sky-400/35 bg-sky-500/15 px-1.5 py-0.5 font-mono text-[9px] text-sky-300">
                            UPLOAD
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{doc.vendor_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] font-mono text-rose-300 hover:bg-rose-500/20 hover:text-white transition-colors"
                      title={`Delete ${doc.file_name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matched Document Excerpts */}
        {results.chunks.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Matched Text Excerpts ({results.chunks.length})
            </h3>
            <div className="space-y-2.5">
              {results.chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  onClick={() => router.push(`/documents/${chunk.document_id}`)}
                  className="cursor-pointer rounded-2xl border border-white/[0.08] bg-[#0B0F19]/92 p-4 hover:border-sky-400/40 hover:bg-[#0E1422] transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono tracking-tight tabular-nums">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                      Document: {chunk.document_id} (Page {chunk.page_number})
                    </span>
                    <span className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-emerald-300">
                      Match Score: {Math.round((chunk.similarity_score || 0.94) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
