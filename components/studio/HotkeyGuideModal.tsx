'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface HotkeyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HOTKEYS = [
  { key: 'J / ↓', description: 'Select next extracted field in ledger' },
  { key: 'K / ↑', description: 'Select previous extracted field in ledger' },
  { key: 'A', description: 'Approve / confirm currently selected field' },
  { key: 'F', description: 'Flag selected field as discrepancy anomaly' },
  { key: 'Del / ⌫', description: 'Remove selected field box from document' },
  { key: '[ / ]', description: 'Navigate previous / next document page' },
  { key: 'H', description: 'Toggle immutable Audit Trail drawer' },
  { key: '?', description: 'Toggle this keyboard ergonomics guide' },
];

export function HotkeyGuideModal({ isOpen, onClose }: HotkeyGuideModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.10] bg-[#07090E]/95 p-6 backdrop-blur-2xl saturate-150 shadow-[0_24px_80px_rgba(0,0,0,0.85)] before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border-t before:border-white/10"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sky-400">
                  <Keyboard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Studio Keyboard Ergonomics</h3>
                  <p className="text-[11px] text-slate-400">
                    High-speed auditor navigation & reconciliation
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {HOTKEYS.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-xs"
                >
                  <span className="text-slate-300">{item.description}</span>
                  <kbd className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-300 tabular-nums">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
