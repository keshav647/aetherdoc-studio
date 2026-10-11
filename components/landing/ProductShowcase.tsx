'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, LayoutGroup } from 'framer-motion';
import { FileText, ArrowRight, Crosshair, UploadCloud } from 'lucide-react';

interface ShowcaseDoc {
  id: string;
  name: string;
  category: string;
  accuracy: string;
  latency: string;
  fields: {
    id: string;
    label: string;
    value: string;
    confidence: number;
    status: 'verified' | 'flagged' | 'raw';
    bbox: { x: number; y: number; w: number; h: number };
    type: string;
  }[];
}

// Minimal 2 Demo Samples (Invoice + Contract) aligned 1:1 with store IDs
const SHOWCASE_DOCS: ShowcaseDoc[] = [
  {
    id: 'doc-inv-8941',
    name: 'Demo Sample: Cloud Invoice',
    category: 'Sample Vendor Invoice',
    accuracy: '88.6%',
    latency: '0.8s',
    fields: [
      {
        id: 'f-8941-01',
        label: 'Vendor Name',
        value: 'Quantum Vertex Cloud Infrastructure Inc.',
        confidence: 0.99,
        status: 'verified',
        bbox: { x: 6, y: 18, w: 54, h: 12 },
        type: 'Vendor',
      },
      {
        id: 'f-8941-02',
        label: 'Invoice Number',
        value: 'INV-2026-8941',
        confidence: 0.99,
        status: 'verified',
        bbox: { x: 63, y: 18, w: 31, h: 12 },
        type: 'Invoice ID',
      },
      {
        id: 'f-8941-05',
        label: 'Primary Line Item',
        value: '$48,250.00 (128x NVIDIA H200 SXM)',
        confidence: 0.96,
        status: 'verified',
        bbox: { x: 6, y: 38, w: 88, h: 14 },
        type: 'Line Item',
      },
      {
        id: 'f-8941-09',
        label: 'State Tax / VAT (8.25%)',
        value: '$5,079.52 USD (Flagged for Review)',
        confidence: 0.62,
        status: 'flagged',
        bbox: { x: 46, y: 58, w: 48, h: 13 },
        type: 'Needs Review',
      },
      {
        id: 'f-8941-10',
        label: 'Total Amount Due',
        value: '$66,649.52 USD',
        confidence: 0.96,
        status: 'verified',
        bbox: { x: 46, y: 74, w: 48, h: 13 },
        type: 'Total',
      },
    ],
  },
  {
    id: 'doc-msa-4420',
    name: 'Demo Sample: Service Agreement',
    category: 'Sample Legal Contract',
    accuracy: '99.1%',
    latency: '1.1s',
    fields: [
      {
        id: 'f-4420-02',
        label: 'Client Name',
        value: 'Apex Global Strategic Holdings Ltd.',
        confidence: 0.99,
        status: 'verified',
        bbox: { x: 6, y: 18, w: 54, h: 12 },
        type: 'Party',
      },
      {
        id: 'f-4420-01',
        label: 'Agreement ID',
        value: 'MSA-2026-APX-4420',
        confidence: 0.99,
        status: 'verified',
        bbox: { x: 63, y: 18, w: 31, h: 12 },
        type: 'Contract ID',
      },
      {
        id: 'f-4420-03',
        label: 'Governing Law',
        value: 'State of New York, Commercial Court',
        confidence: 0.98,
        status: 'verified',
        bbox: { x: 6, y: 38, w: 88, h: 14 },
        type: 'Jurisdiction',
      },
      {
        id: 'f-4420-04',
        label: 'Liability Cap',
        value: '$5,000,000.00 USD (12x Monthly Fees)',
        confidence: 0.97,
        status: 'verified',
        bbox: { x: 6, y: 58, w: 88, h: 14 },
        type: 'Liability',
      },
      {
        id: 'f-4420-05',
        label: 'Security & Privacy Standard',
        value: 'AES-256 Encryption • Strict Workspace Isolation',
        confidence: 0.99,
        status: 'verified',
        bbox: { x: 6, y: 76, w: 88, h: 12 },
        type: 'Security',
      },
    ],
  },
];

export function ProductShowcase() {
  const router = useRouter();
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number>(0);

  const activeDoc = SHOWCASE_DOCS[activeDocIndex];
  const selectedField = activeDoc.fields[selectedFieldIndex] || activeDoc.fields[0];

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0B0F19]/90 px-3.5 py-1 text-xs text-slate-300 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          <span className="font-mono text-[11px] tracking-wide text-slate-300">
            INTERACTIVE STUDIO PREVIEW
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-editorial font-normal tracking-tight text-white">
          See how extracted fields link directly to the page.
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-sans leading-relaxed">
          Explore one of the 2 demo samples below, or upload your own document to start reviewing and exporting structured data.
        </p>
      </div>

      {/* Interactive Document Switcher Tabs + Upload Your Own CTA */}
      <LayoutGroup id="showcaseDocTabs">
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
          {SHOWCASE_DOCS.map((doc, idx) => {
            const isActive = activeDocIndex === idx;
            return (
              <button
                key={doc.id}
                onClick={() => {
                  setActiveDocIndex(idx);
                  setSelectedFieldIndex(0);
                }}
                className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-[#07090E] font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="showcaseTabPill"
                    transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-white shadow-sm"
                  />
                )}
                <FileText className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">{doc.name}</span>
              </button>
            );
          })}

          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 rounded-full border border-sky-400/35 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 hover:text-white transition-colors"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>+ Upload Your Own Document</span>
          </button>
        </div>
      </LayoutGroup>

      {/* Main Dual-Pane Showcase Console */}
      <div className="relative rounded-3xl border border-white/[0.08] bg-[#0B0F19]/92 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
        {/* Console Topbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-3.5 bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
              DEMO SAMPLE
            </span>
            <span className="font-mono text-xs text-slate-300">
              {activeDoc.name}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tracking-tight tabular-nums text-slate-400">
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Confidence {activeDoc.accuracy}
            </span>
            <Link
              href={`/documents/${activeDoc.id}?field=${selectedField.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[#07090E] font-sans font-semibold hover:bg-slate-200 transition-all text-xs"
            >
              <span>Open in Review Studio</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Dual-Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
          {/* Left Pane: Highlighted Document Sheet */}
          <div className="lg:col-span-7 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-white/[0.06] flex flex-col justify-between bg-[#07090E]/85 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="relative aspect-[1/1.22] max-w-lg mx-auto w-full rounded-2xl border border-white/[0.09] bg-[#090C14] p-6 shadow-2xl">
              {/* Document Header Bar */}
              <div className="border-b border-white/[0.07] pb-3 flex justify-between items-start">
                <div>
                  <span className="font-mono text-[9px] text-sky-400 uppercase tracking-wider font-semibold">
                    DOCUMENT PAGE PREVIEW
                  </span>
                  <h4 className="text-xs font-semibold text-white mt-0.5">{activeDoc.name}</h4>
                </div>
                <span className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] text-slate-300">
                  {activeDoc.category}
                </span>
              </div>

              {/* Highlighted Field Regions */}
              {activeDoc.fields.map((f, idx) => {
                const isSelected = selectedFieldIndex === idx;
                const isFlagged = f.status === 'flagged';

                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFieldIndex(idx)}
                    style={{
                      position: 'absolute',
                      left: `${f.bbox.x}%`,
                      top: `${f.bbox.y}%`,
                      width: `${f.bbox.w}%`,
                      height: `${f.bbox.h}%`,
                    }}
                    className={`cursor-pointer rounded-xl px-3 py-1.5 flex flex-col justify-center select-none transition-colors ${
                      isSelected
                        ? isFlagged
                          ? 'border-2 border-rose-400 bg-rose-500/15 z-20'
                          : 'border-2 border-sky-400 bg-sky-500/15 z-20'
                        : 'border border-white/[0.10] bg-white/[0.025] hover:border-white/25 z-10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 truncate">
                        {f.label}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] tabular-nums text-slate-300 shrink-0">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isFlagged ? 'bg-rose-400' : 'bg-emerald-400'
                          }`}
                        />
                        {(f.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="font-mono text-[11px] font-semibold text-white tracking-tight tabular-nums truncate mt-0.5">
                      {f.value}
                    </p>
                  </div>
                );
              })}

              {/* Bottom Info Strip */}
              <div className="absolute inset-x-6 bottom-3 border-t border-white/[0.06] pt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono tracking-tight tabular-nums">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Crosshair className="h-3 w-3 text-sky-400" />
                  Selected: {selectedField.label}
                </span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>

          {/* Right Pane: Synchronized Field List */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-[#0B0F19]/90">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
                <div>
                  <h4 className="text-sm font-semibold text-white">Extracted Fields</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any field card or highlighted box to inspect
                  </p>
                </div>
                <span className="rounded bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono tracking-tight tabular-nums text-slate-300">
                  {activeDoc.fields.length} Fields
                </span>
              </div>

              <div className="space-y-2.5">
                {activeDoc.fields.map((field, idx) => {
                  const isSelected = selectedFieldIndex === idx;
                  const isFlagged = field.status === 'flagged';

                  return (
                    <div
                      key={field.id}
                      onClick={() => setSelectedFieldIndex(idx)}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition-colors ${
                        isSelected
                          ? 'border-sky-400/40 bg-sky-500/[0.07]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.035]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-200">{field.label}</span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-tight tabular-nums">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isFlagged ? 'bg-rose-400' : 'bg-emerald-400'
                            }`}
                          />
                          <span
                            className={`font-semibold ${
                              isFlagged ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {(field.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <p className="font-mono text-xs text-white break-all tracking-tight tabular-nums">
                        {field.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Have your own invoice or contract?
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
              >
                <span>Upload Your Document</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
