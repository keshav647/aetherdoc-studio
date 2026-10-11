'use client';

import React from 'react';
import { DocumentRecord, ExtractedField, DocumentType } from '@/lib/extraction/types';
import { FileCheck2, Shield, Building2, Scale, Landmark, FileSpreadsheet, FileText } from 'lucide-react';

interface DocumentPageRendererProps {
  document: DocumentRecord;
  fields: ExtractedField[];
  currentPage: number;
  activeFieldId?: string | null;
  hoveredFieldId?: string | null;
}

// Section heading labels per document type — used for the dividers on each page
function getPageSectionLabels(
  docType: DocumentType,
  isResume: boolean,
  currentPage: number,
  pageCount: number
): { top: string; mid: string; bot: string } {
  const pageLabel = `Page ${currentPage} of ${pageCount}`;

  if (isResume) {
    if (currentPage === 1) {
      return {
        top: 'I. Identity, Contact & Profile Summary',
        mid: 'II. Education, Degree & Academic Background',
        bot: 'III. Professional Experience & Work History',
      };
    }
    if (currentPage === 2) {
      return {
        top: 'IV. Technical Skills & Core Competencies',
        mid: 'V. Key Projects & Systems Built',
        bot: 'VI. Certifications, Awards & Achievements',
      };
    }
    return {
      top: `§${(currentPage - 1) * 3 + 1}. Additional Experience & Details`,
      mid: `§${(currentPage - 1) * 3 + 2}. Extended Background & Context`,
      bot: pageLabel,
    };
  }

  const sectionBase = (currentPage - 1) * 3;

  const labels: Record<DocumentType, { top: string; mid: string; bot: string }[]> = {
    INVOICE: [
      { top: 'I. Vendor & Billing Header', mid: 'II. Invoice Reference & Dates', bot: 'III. Line Items & Charges' },
      { top: 'IV. Payment Terms & Tax', mid: 'V. Extended Line Items', bot: 'VI. Totals & Balance Due' },
    ],
    CONTRACT: [
      { top: 'I. Contracting Parties & Agreement Title', mid: 'II. Effective Dates & Term', bot: 'III. Scope of Work & Obligations' },
      { top: 'IV. Fees, Payment & Milestones', mid: 'V. Confidentiality, IP & SLA', bot: 'VI. Governing Law & Signatures' },
    ],
    BALANCE_SHEET: [
      { top: 'I. Reporting Entity & Statement Period', mid: 'II. Assets & Current Holdings', bot: 'III. Liabilities & Equity' },
      { top: 'IV. Income & Revenue Breakdown', mid: 'V. Cash Flow & Adjustments', bot: 'VI. Notes & Disclosures' },
    ],
    AUDIT_STATEMENT: [
      { top: 'I. Audit Scope & Engagement Details', mid: 'II. Key Findings & Observations', bot: 'III. Risk Assessment & Ratings' },
      { top: 'IV. Recommendations & Remediation', mid: 'V. Compliance Status & Controls', bot: 'VI. Auditor Sign-off & Summary' },
    ],
    RESUME: [
      { top: 'I. Identity & Contact', mid: 'II. Education & Degree', bot: 'III. Experience' },
      { top: 'IV. Skills & Competencies', mid: 'V. Projects', bot: 'VI. Certifications' },
    ],
    GENERAL: [
      { top: 'I. Document Overview & Header', mid: 'II. Primary Content & Key Data', bot: 'III. Supporting Details' },
      { top: 'IV. Extended Content & Sections', mid: 'V. Additional Specifications', bot: 'VI. Summary & Conclusions' },
    ],
  };

  const typeLabels = labels[docType] || labels.GENERAL;
  const pageIdx = Math.min(currentPage - 1, typeLabels.length - 1);
  if (currentPage <= typeLabels.length) {
    return typeLabels[pageIdx];
  }
  // For pages beyond our label table — generic section headers
  return {
    top: `§${sectionBase + 1}. Continued Content — Page ${currentPage}`,
    mid: `§${sectionBase + 2}. Details & Specifications`,
    bot: `§${sectionBase + 3}. Supporting Information`,
  };
}

export function DocumentPageRenderer({
  document,
  fields,
  currentPage,
  activeFieldId,
  hoveredFieldId,
}: DocumentPageRendererProps) {
  const pageFields = fields.filter((f) => f.page_number === currentPage);
  const hoveredOnPage = pageFields.some((f) => f.id === hoveredFieldId) ? hoveredFieldId : null;
  const focusedFieldId = hoveredOnPage || activeFieldId;

  const isResumeDoc =
    document.document_type === 'RESUME' ||
    document.file_name.toLowerCase().includes('resume') ||
    document.file_name.toLowerCase().includes('cv');

  const getDocTypeBadge = () => {
    if (isResumeDoc) {
      return { label: 'CANDIDATE RESUME / CV', code: 'RESUME', icon: FileCheck2 };
    }
    switch (document.document_type) {
      case 'INVOICE':
        return { label: 'COMMERCIAL INVOICE', code: 'INVOICE', icon: Building2 };
      case 'CONTRACT':
        return { label: 'SERVICE AGREEMENT / CONTRACT', code: 'CONTRACT', icon: Scale };
      case 'BALANCE_SHEET':
        return { label: 'FINANCIAL STATEMENT', code: 'STATEMENT', icon: Landmark };
      case 'AUDIT_STATEMENT':
        return { label: 'AUDIT / COMPLIANCE REPORT', code: 'AUDIT', icon: Shield };
      case 'GENERAL':
        return { label: 'UPLOADED DOCUMENT', code: 'DOCUMENT', icon: FileText };
      default:
        return { label: 'UPLOADED DOCUMENT', code: 'DOCUMENT', icon: FileCheck2 };
    }
  };

  const badge = getDocTypeBadge();
  const BadgeIcon = badge.icon;
  const isUploadedImage = document.file_url?.startsWith('data:image/');

  const sectionLabels = getPageSectionLabels(
    document.document_type,
    isResumeDoc,
    currentPage,
    document.page_count
  );

  // Dynamically derive the categories actually present on this page
  const pageCategories = Array.from(
    new Set(
      pageFields.map((f) => {
        const rawCat = (f.category || '').trim() || 'General Information';
        if (rawCat === 'DOCUMENT_META') return 'Metadata & Parties';
        if (rawCat === 'LINE_ITEMS') return 'Core Content & Items';
        if (rawCat === 'FINANCIAL_TOTALS') return 'Totals & Metrics';
        if (rawCat === 'COMPLIANCE') return 'Compliance & Qualifications';
        return rawCat;
      })
    )
  );

  const pageRawTextFallback = React.useMemo(() => {
    if (!document.raw_text) return '';
    const chunks = document.raw_text
      .split(/\n?---\s*\[PAGE_BREAK\]\s*---\n?/)
      .map((c) => c.trim())
      .filter(Boolean);
    return chunks[currentPage - 1] || '';
  }, [document.raw_text, currentPage]);

  return (
    <div className="absolute inset-0 select-none font-sans text-slate-200 overflow-hidden">
      {/* Subtle architectural grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* If user uploaded a real image, render it in the page viewport */}
      {isUploadedImage && (
        <img
          src={document.file_url}
          alt={document.file_name}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-90"
        />
      )}

      {/* Top Document Classification Strip (Strictly contained in top 1.5% - 4.8% band so it never touches field boxes) */}
      <div
        style={{ left: '6%', top: '1.5%', width: '88%', height: '3.3%' }}
        className="absolute flex items-center justify-between gap-2 border-b border-white/[0.08] text-[9px] font-mono tracking-wider uppercase text-slate-400 bg-[#090C14]/90 px-2.5 rounded z-10"
      >
        <span className="flex items-center gap-1.5 text-sky-300/95 font-semibold truncate min-w-0">
          <BadgeIcon className="h-3 w-3 text-sky-400 shrink-0" />
          <span className="truncate">
            {badge.label} • {document.isDemo ? 'DEMO SAMPLE' : 'YOUR UPLOAD'}
          </span>
        </span>
        <span className="tabular-nums text-slate-300 font-semibold shrink-0 whitespace-nowrap">
          {pageFields.length} {pageFields.length === 1 ? 'FIELD' : 'FIELDS'} •{' '}
          {document.extraction_engine?.includes('Local') ? 'LOCAL SCAN' : 'AI SCAN'} • PAGE{' '}
          {currentPage} OF {document.page_count}
        </span>
      </div>

      {/* Fallback when a page has 0 fields: render real page text if available */}
      {!isUploadedImage && !document.isDemo && pageFields.length === 0 && (
        <div
          style={{ left: '6%', top: '8%', width: '88%', height: '82%' }}
          className="absolute rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 flex flex-col justify-between overflow-hidden"
        >
          {pageRawTextFallback ? (
            <div className="space-y-2 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 font-semibold">
                  Verbatim Page {currentPage} Content
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  Use + Add Field Box to annotate
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                {pageRawTextFallback}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500">
              <FileSpreadsheet className="h-7 w-7 opacity-40" />
              <p className="text-[10px] font-mono tracking-wide text-center max-w-xs leading-relaxed px-4">
                Page {currentPage} — Click <span className="text-sky-400">AI Scan</span> or{' '}
                <span className="text-sky-400">Local Scan</span> in the top bar to extract fields, or use{' '}
                <span className="text-sky-400">+ Add Field Box</span> to annotate manually.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Demo dividers ONLY when viewing unaltered original mock fields */}
      {!isUploadedImage &&
        document.isDemo &&
        pageFields.some((f) => f.id.startsWith('f-8941-') || f.id.startsWith('f-4420-')) &&
        currentPage === 1 && (
          <>
            <div
              style={{ left: '6%', top: '17.8%', width: '88%' }}
              className="pointer-events-none absolute flex items-center justify-between border-b border-white/[0.06] pb-1 text-[9px] font-mono uppercase tracking-widest text-slate-400"
            >
              <span>{sectionLabels.top}</span>
              <span>Page 1</span>
            </div>
            <div
              style={{ left: '6%', top: '33.5%', width: '88%' }}
              className="pointer-events-none absolute flex items-center justify-between border-b border-white/[0.08] pb-1 text-[9px] font-mono uppercase tracking-widest text-slate-400"
            >
              <span>{sectionLabels.mid}</span>
              <span className="tabular-nums">{pageFields.length} Extracted Fields</span>
            </div>
            <div
              style={{ left: '6%', top: '61.8%', width: '88%' }}
              className="pointer-events-none absolute flex items-center justify-between border-b border-white/[0.06] pb-1 text-[9px] font-mono uppercase tracking-widest text-slate-400"
            >
              <span>{sectionLabels.bot}</span>
              <span>Confidence: {document.accuracy_rate}%</span>
            </div>
          </>
        )}

      {/* Highlighted Field Blocks */}
      {!isUploadedImage &&
        pageFields.map((field) => {
          const left = `${field.bbox.x * 100}%`;
          const top = `${field.bbox.y * 100}%`;
          const width = `${field.bbox.w * 100}%`;
          const height = `${field.bbox.h * 100}%`;
          const isCompact = field.bbox.h < 0.062;
          const isFocused = focusedFieldId === field.id;
          const cleanCategory =
            field.category &&
            !['DOCUMENT_META', 'LINE_ITEMS', 'FINANCIAL_TOTALS', 'COMPLIANCE'].includes(
              field.category
            )
              ? field.category
              : null;

          const clampClass =
            field.bbox.h < 0.095
              ? 'line-clamp-2'
              : field.bbox.h < 0.135
              ? 'line-clamp-3'
              : field.bbox.h < 0.185
              ? 'line-clamp-5'
              : 'line-clamp-7';

          return (
            <div
              key={field.id}
              style={{ left, top, width, height }}
              className={`absolute rounded-lg bg-white/[0.025] px-2.5 overflow-hidden ${
                isCompact
                  ? 'flex items-center justify-between gap-2 py-0.5'
                  : 'py-1.5 flex flex-col justify-start'
              }`}
            >
              {isCompact ? (
                <>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-300 truncate min-w-0">
                    {field.label}:
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 max-w-[68%]">
                    {isFocused && (
                      <span className="text-[8.5px] font-mono font-semibold text-sky-300 tabular-nums shrink-0">
                        {(field.confidence * 100).toFixed(1)}%
                      </span>
                    )}
                    <span className="text-[10.5px] font-mono font-semibold text-white tracking-tight tabular-nums truncate">
                      {field.field_value}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 leading-none shrink-0 pb-1 border-b border-white/[0.06]">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                      {cleanCategory && field.bbox.w >= 0.65 && (
                        <span className="rounded bg-sky-500/15 border border-sky-400/25 px-1.5 py-0.5 text-[7.5px] font-mono uppercase tracking-wider text-sky-300 shrink-0 max-w-[140px] truncate">
                          {cleanCategory}
                        </span>
                      )}
                      <span className="text-[9px] font-mono uppercase tracking-wider text-sky-300/95 font-semibold truncate">
                        {field.label}
                      </span>
                    </div>
                    <span
                      className={`text-[8.5px] font-mono tabular-nums shrink-0 ${
                        isFocused ? 'font-semibold text-sky-300' : 'text-slate-400'
                      }`}
                    >
                      {(field.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p
                    className={`text-[10px] font-mono font-medium text-slate-100 tracking-tight tabular-nums whitespace-normal break-words mt-1 leading-snug ${clampClass}`}
                  >
                    {field.field_value}
                  </p>
                </>
              )}
            </div>
          );
        })}

      {/* Bottom Document Footer Strip */}
      <div
        style={{ left: '6%', bottom: '1.8%', width: '88%' }}
        className="absolute border-t border-white/[0.08] pt-1.5 flex items-center justify-between gap-3 text-[9px] font-mono tracking-tight tabular-nums text-slate-400"
      >
        <span className="truncate min-w-0">
          {pageCategories.length > 0
            ? `CATEGORIES: ${pageCategories.slice(0, 4).join(' • ').toUpperCase()}`
            : `AETHERDOC REVIEW STUDIO • ${
                document.vendor_name?.toUpperCase() || document.file_name.toUpperCase()
              }`}
        </span>
        <span className="shrink-0 font-semibold text-sky-300/90 whitespace-nowrap">
          {document.id.toUpperCase()} • PAGE {currentPage} / {document.page_count}
        </span>
      </div>
    </div>
  );
}
