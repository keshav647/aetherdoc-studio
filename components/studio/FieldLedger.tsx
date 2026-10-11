'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ExtractedField, FieldCategory, DocumentType } from '@/lib/extraction/types';
import { FieldCard } from './FieldCard';
import {
  CheckCheck,
  Download,
  Layers,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  FileStack,
} from 'lucide-react';

interface FieldLedgerProps {
  fields: ExtractedField[];
  documentType?: DocumentType;
  currentPage?: number;
  activeFieldId: string | null;
  hoveredFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onHoverField: (fieldId: string | null) => void;
  onUpdateField: (
    fieldId: string,
    newValue: string,
    action: 'OVERRIDE' | 'CONFIRM' | 'FLAG'
  ) => void;
  onDeleteField?: (fieldId: string) => void;
  onBatchVerify: () => void;
  onOpenAuditHistory: (field: ExtractedField) => void;
}

const LEGACY_CATEGORY_TITLES: Record<string, { title: string; subtitle: string }> = {
  DOCUMENT_META: {
    title: 'Document Metadata & Parties',
    subtitle: 'Identifiers, entities, and dates',
  },
  LINE_ITEMS: {
    title: 'Line Items & Table Entities',
    subtitle: 'Extracted items, services, and key details',
  },
  FINANCIAL_TOTALS: {
    title: 'Financial Totals & Tax Schedules',
    subtitle: 'Subtotals, tax, and summary amounts',
  },
  COMPLIANCE: {
    title: 'Compliance, Banking & Attestations',
    subtitle: 'Terms, qualifications, and regulatory details',
  },
};

const RESUME_OR_GENERAL_TITLES: Record<string, { title: string; subtitle: string }> = {
  DOCUMENT_META: {
    title: 'Identity & Primary Metadata',
    subtitle: 'Candidate / author details, role, and file info',
  },
  LINE_ITEMS: {
    title: 'Core Experience, Skills & Content',
    subtitle: 'Extracted skills, projects, and primary content',
  },
  FINANCIAL_TOTALS: {
    title: 'Key Highlights & Summary',
    subtitle: 'Primary achievements and summary metrics',
  },
  COMPLIANCE: {
    title: 'Education, Credentials & Qualifications',
    subtitle: 'Academic background, certifications, and dates',
  },
};

function resolveCategoryDisplay(
  rawCategory: FieldCategory,
  documentType: DocumentType | undefined,
  categoryFields: ExtractedField[]
): { title: string; subtitle: string } {
  const key = (rawCategory || '').trim() || 'General Information';
  const isNonFinancialDoc = documentType === 'RESUME' || documentType === 'GENERAL';
  const legacyMap = isNonFinancialDoc ? RESUME_OR_GENERAL_TITLES : LEGACY_CATEGORY_TITLES;

  if (legacyMap[key]) {
    return legacyMap[key];
  }

  const pages = Array.from(new Set(categoryFields.map((f) => f.page_number || 1))).sort(
    (a, b) => a - b
  );
  const pageText =
    pages.length === 1
      ? `Page ${pages[0]}`
      : pages.length > 1
      ? `Pages ${pages.join(', ')}`
      : 'Page 1';

  return {
    title: key,
    subtitle: `${pageText} • ${categoryFields.length} extracted ${
      categoryFields.length === 1 ? 'field' : 'fields'
    }`,
  };
}

export function FieldLedger({
  fields,
  documentType,
  currentPage,
  activeFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
  onUpdateField,
  onDeleteField,
  onBatchVerify,
  onOpenAuditHistory,
}: FieldLedgerProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyCurrentPage, setOnlyCurrentPage] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const verifiedCount = fields.filter((f) => f.status === 'verified').length;
  const flaggedCount = fields.filter((f) => f.status === 'flagged').length;
  const pendingCount = fields.filter((f) => f.status === 'raw').length;

  const totalPagesInFields = useMemo(
    () => fields.reduce((max, f) => Math.max(max, f.page_number || 1), 1),
    [fields]
  );

  // Container-isolated scroll to active card (never scrolls outer window)
  useEffect(() => {
    if (!activeFieldId || !scrollContainerRef.current) return;
    const activeField = fields.find((f) => f.id === activeFieldId);
    if (activeField) {
      const cat = (activeField.category || '').trim() || 'General Information';
      if (collapsedCategories[cat]) {
        setCollapsedCategories((prev) => ({ ...prev, [cat]: false }));
      }
    }

    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      const cardEl = window.document.getElementById(`field-card-${activeFieldId}`);
      if (!cardEl || !container) return;

      const containerRect = container.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();

      if (cardRect.top < containerRect.top + 12) {
        container.scrollTo({
          top: container.scrollTop + (cardRect.top - containerRect.top) - 16,
          behavior: 'smooth',
        });
      } else if (cardRect.bottom > containerRect.bottom - 12) {
        container.scrollTo({
          top: container.scrollTop + (cardRect.bottom - containerRect.bottom) + 16,
          behavior: 'smooth',
        });
      }
    }, 30);

    return () => clearTimeout(timer);
  }, [activeFieldId, fields, collapsedCategories]);

  const filteredFields = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return fields.filter((f) => {
      if (filter === 'pending' && f.status !== 'raw' && f.status !== 'flagged') return false;
      if (filter === 'verified' && f.status !== 'verified') return false;
      if (onlyCurrentPage && currentPage && (f.page_number || 1) !== currentPage) return false;
      if (q) {
        const hay = `${f.label} ${f.field_key} ${f.field_value} ${f.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fields, filter, onlyCurrentPage, currentPage, searchQuery]);

  // Dynamically derive categories from the document's actual fields (preserving order of appearance)
  const dynamicCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const f of filteredFields) {
      const cat = (f.category || '').trim() || 'General Information';
      if (!seen.has(cat)) {
        seen.add(cat);
        list.push(cat);
      }
    }
    return list;
  }, [filteredFields]);

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleBatchVerifyWithConfetti = () => {
    onBatchVerify();
    confetti({
      particleCount: 70,
      spread: 65,
      origin: { y: 0.6 },
      colors: ['#10B981', '#38BDF8', '#F8FAFC'],
    });
  };

  const handleExportJson = () => {
    const data = {
      exportTimestamp: new Date().toISOString(),
      verifiedBy: 'Local Reviewer',
      fields: fields.map((f) => ({
        key: f.field_key,
        label: f.label,
        value: f.field_value,
        category: f.category,
        page_number: f.page_number,
        confidence: f.confidence,
        status: f.status,
        bbox: f.bbox,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AetherDoc-Audit-Export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: 'all' | 'pending' | 'verified'; label: string; count: number; dot?: string }[] =
    [
      { id: 'all', label: 'All Fields', count: fields.length },
      {
        id: 'pending',
        label: 'Pending',
        count: pendingCount + flaggedCount,
        dot: 'bg-amber-400',
      },
      { id: 'verified', label: 'Verified', count: verifiedCount, dot: 'bg-emerald-400' },
    ];

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0F19]/90 shadow-[0_8px_32px_0_rgba(0,0,0,0.42),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      {/* Header with Ledger Title & Batch Actions */}
      <div className="border-b border-white/[0.06] p-4 bg-white/[0.015] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-400" />
              Extraction & Audit Ledger
            </h3>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight tabular-nums mt-0.5">
              {verifiedCount} of {fields.length} fields reconciled (
              {Math.round((verifiedCount / Math.max(fields.length, 1)) * 100)}%) •{' '}
              {dynamicCategories.length}{' '}
              {dynamicCategories.length === 1 ? 'category' : 'categories'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
              title="Export Reconciled JSON"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={handleBatchVerifyWithConfetti}
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#07090E] px-3.5 py-1.5 text-xs font-semibold hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Approve All
            </button>
          </div>
        </div>

        {/* Reconciliation Progress Fill Bar */}
        <div className="mb-3 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${(verifiedCount / Math.max(fields.length, 1)) * 100}%` }}
          />
        </div>

        {/* Search Input + Page Scope Filter */}
        <div className="mb-2.5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields, values, or categories..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#07090E]/90 pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-sky-400/50 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {totalPagesInFields > 1 && currentPage && (
            <button
              type="button"
              onClick={() => setOnlyCurrentPage((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-mono font-medium transition-all shrink-0 ${
                onlyCurrentPage
                  ? 'border-sky-400/45 bg-sky-500/20 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.18)]'
                  : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={
                onlyCurrentPage
                  ? 'Showing only fields on the current page. Click to show all pages.'
                  : `Filter ledger to show only Page ${currentPage} fields`
              }
            >
              <FileStack className="h-3.5 w-3.5" />
              {onlyCurrentPage ? `Page ${currentPage} Only` : 'All Pages'}
            </button>
          )}
        </div>

        {/* Shared-Layout Spring Filter Tabs */}
        <LayoutGroup>
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.02] p-1 border border-white/[0.06] text-xs">
            {tabs.map((tab) => {
              const isSelected = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`relative flex-1 rounded-lg py-1.5 font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="ledgerFilterPill"
                      className="absolute inset-0 rounded-lg bg-white/[0.08] border border-white/[0.12] shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {tab.dot && <span className={`h-1.5 w-1.5 rounded-full ${tab.dot}`} />}
                    <span>{tab.label}</span>
                    <span className="font-mono tracking-tight tabular-nums text-[10px] text-slate-300">
                      ({tab.count})
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {/* Field List Categorized Dynamically */}
      <div
        ref={scrollContainerRef}
        onMouseLeave={() => onHoverField(null)}
        className="flex-1 overflow-y-auto p-4 space-y-5"
      >
        {dynamicCategories.map((category) => {
          const categoryFields = filteredFields.filter(
            (f) => ((f.category || '').trim() || 'General Information') === category
          );
          if (categoryFields.length === 0) return null;

          const meta = resolveCategoryDisplay(category, documentType, categoryFields);
          const isCollapsed = Boolean(collapsedCategories[category]);

          return (
            <div key={category} className="space-y-2.5">
              <button
                type="button"
                onClick={() => toggleCategoryCollapse(category)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors text-left group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-white shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 truncate">
                      {meta.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">{meta.subtitle}</p>
                  </div>
                </div>
                <span className="font-mono tracking-tight tabular-nums text-[10px] text-sky-300 rounded-full bg-sky-500/10 border border-sky-400/25 px-2 py-0.5 shrink-0 ml-2">
                  {categoryFields.length}
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-2">
                  {categoryFields.map((field) => (
                    <FieldCard
                      key={field.id}
                      field={field}
                      currentPage={currentPage}
                      isActive={activeFieldId === field.id}
                      isHovered={hoveredFieldId === field.id}
                      onSelect={() => onSelectField(field.id)}
                      onHover={(hovered) => onHoverField(hovered ? field.id : null)}
                      onUpdateValue={onUpdateField}
                      onDeleteField={onDeleteField}
                      onOpenAuditHistory={onOpenAuditHistory}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredFields.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-500 font-mono space-y-2">
            <p>No fields match the active filter.</p>
            {(searchQuery || onlyCurrentPage || filter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setOnlyCurrentPage(false);
                  setFilter('all');
                }}
                className="text-sky-400 hover:underline text-[11px]"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
