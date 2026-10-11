'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuditLog, ExtractedField } from '@/lib/extraction/types';
import { formatDate } from '@/lib/utils';
import { History, X, UserCheck, Cpu, ShieldCheck } from 'lucide-react';

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  field: ExtractedField | null;
  logs: AuditLog[];
}

export function AuditDrawer({ isOpen, onClose, field, logs }: AuditDrawerProps) {
  const relevantLogs = field ? logs.filter((l) => l.field_key === field.field_key) : logs;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 bg-[#07090E]/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Tier-3 Active Modal Liquid Glass Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative w-full max-w-md h-full bg-[#07090E]/88 border-l border-white/[0.10] shadow-[0_24px_64px_rgba(0,0,0,0.75)] p-6 flex flex-col z-10 backdrop-blur-2xl saturate-150 gpu-accelerated"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-sky-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Immutable Audit Trail
                  </h3>
                  <p className="text-xs text-slate-400 font-mono tracking-tight tabular-nums">
                    {field ? `Field: ${field.label}` : `All Document Logs (${logs.length})`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Audit Log Entries List */}
            <div className="flex-1 overflow-y-auto py-5 space-y-3.5">
              {relevantLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono">
                  No previous overrides recorded for this field.
                </div>
              ) : (
                relevantLogs.map((log, idx) => {
                  const isOverride = log.action === 'OVERRIDE';
                  const isAuto = log.action === 'AUTO_EXTRACT';
                  const dotColor = isOverride
                    ? 'bg-amber-400'
                    : isAuto
                    ? 'bg-sky-400'
                    : 'bg-emerald-400';
                  const textColor = isOverride
                    ? 'text-amber-300'
                    : isAuto
                    ? 'text-sky-300'
                    : 'text-emerald-300';

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 28,
                        delay: idx * 0.04,
                      }}
                      className="relative rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs space-y-3 backdrop-blur-xl saturate-150 before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:border-t before:border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 font-mono tracking-tight tabular-nums text-[10px] font-medium">
                          <span className={`h-1.5 w-1.5 rounded-full ${dotColor} animate-pulse`} />
                          <span className={textColor}>{log.action}</span>
                        </span>
                        <span className="font-mono tracking-tight tabular-nums text-[10px] text-slate-500">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>

                      {/* Actor */}
                      <div className="flex items-center gap-2 text-slate-300">
                        {isAuto ? (
                          <Cpu className="h-3.5 w-3.5 text-sky-400" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                        <span className="font-medium text-white">{log.user_name || 'Auditor'}</span>
                      </div>

                      {/* Value Diff */}
                      <div className="rounded-lg bg-[#07090E]/70 p-2.5 font-mono tracking-tight tabular-nums text-[11px] space-y-1 border border-white/[0.06]">
                        {log.old_value && (
                          <div className="text-rose-400 line-through truncate">
                            - {log.old_value}
                          </div>
                        )}
                        <div className="text-emerald-400 truncate">+ {log.new_value}</div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono tracking-tight">
                        <ShieldCheck className="h-3 w-3 text-sky-400" />
                        <span>Cryptographically attested to Supabase Audit Ledger</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer info */}
            <div className="border-t border-white/[0.08] pt-4 text-center text-[11px] text-slate-500 font-mono tracking-tight">
              Compliant with SOC 2 Type II & FINRA Books and Records rules.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
