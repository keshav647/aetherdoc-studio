'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import {
  Search,
  FileText,
  Tag,
  BookOpen,
  ArrowRight,
  X,
  Crosshair,
} from 'lucide-react';

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandBar({ isOpen, onClose }: CommandBarProps) {
  const router = useRouter();
  const { documents, fieldsByDoc, searchHybrid } = useAppStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const results = query.trim()
    ? searchHybrid(query)
    : {
        documents: documents.slice(0, 4),
        matchedFields: Object.values(fieldsByDoc).flat().slice(0, 4),
        chunks: [],
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 440, damping: 32 }}
            className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/[0.10] bg-[#07090E]/95 shadow-[0_24px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl saturate-150 overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border-t before:border-white/10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5">
              <Search className="h-4 w-4 text-sky-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Jump to document, extracted field, or bounding box... (e.g. 'H200', 'VAT', 'MSA')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results Container */}
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
              {query &&
                results.documents.length === 0 &&
                results.matchedFields.length === 0 &&
                results.chunks.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matching records or field anchors found for &quot;{query}&quot;.
                  </div>
                )}

              {/* Matched Documents */}
              {results.documents.length > 0 && (
                <div>
                  <p className="px-2 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                    {query ? `Matched Documents (${results.documents.length})` : 'Quick Jump — Documents'}
                  </p>
                  <div className="space-y-1">
                    {results.documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          onClose();
                          router.push(`/documents/${doc.id}`);
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-sky-400" />
                          <div>
                            <p className="font-medium text-white">{doc.file_name}</p>
                            <p className="text-[10px] text-slate-400">
                              {doc.vendor_name || doc.document_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 tabular-nums">
                          <span>{doc.accuracy_rate}% SLA</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Extracted Fields */}
              {results.matchedFields.length > 0 && (
                <div>
                  <p className="px-2 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                    {query
                      ? `Coordinate Field Anchors (${results.matchedFields.length})`
                      : 'Recent Field Anchors'}
                  </p>
                  <div className="space-y-1">
                    {results.matchedFields.slice(0, 6).map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          onClose();
                          router.push(`/documents/${f.document_id}?field=${f.id}`);
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Tag className="h-4 w-4 text-emerald-400" />
                          <div>
                            <p className="font-medium text-white">{f.label}</p>
                            <p className="font-mono text-[11px] text-slate-300 tracking-tight tabular-nums">
                              {f.field_value}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-300 font-mono tracking-tight tabular-nums">
                          <Crosshair className="h-3 w-3 text-sky-400" />
                          P{f.page_number} [{f.bbox.x.toFixed(2)}, {f.bbox.y.toFixed(2)}]
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Content Chunks */}
              {results.chunks.length > 0 && (
                <div>
                  <p className="px-2 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                    Semantic Text Chunks ({results.chunks.length})
                  </p>
                  <div className="space-y-1">
                    {results.chunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        onClick={() => {
                          onClose();
                          router.push(`/documents/${chunk.document_id}`);
                        }}
                        className="flex cursor-pointer items-start justify-between rounded-xl px-3 py-2 text-xs hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-start gap-2.5">
                          <BookOpen className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-slate-300 line-clamp-2 leading-relaxed">
                              {chunk.content}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {chunk.document_id} • Page {chunk.page_number}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer shortcuts */}
            <div className="flex items-center justify-between border-t border-white/[0.08] bg-black/40 px-4 py-2.5 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px]">
                  ESC
                </kbd>
                <span>to close</span>
              </div>
              <span className="text-sky-400">Click any item to jump to Studio</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
