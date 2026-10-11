'use client';

import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ExtractedField,
  DocumentRecord,
  FieldCategory,
  NormalizedBBox,
} from '@/lib/extraction/types';
import { toNormalizedBBox } from '@/lib/extraction/normalizer';
import { BoundingBoxLayer } from './BoundingBoxLayer';
import { DocumentPageRenderer } from './DocumentPageRenderer';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Crosshair,
  PlusSquare,
  Check,
  X,
  Trash2,
} from 'lucide-react';

gsap.registerPlugin(useGSAP);

interface PdfCanvasViewerProps {
  document: DocumentRecord;
  fields: ExtractedField[];
  activeFieldId: string | null;
  hoveredFieldId: string | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSelectField: (fieldId: string) => void;
  onHoverField: (fieldId: string | null) => void;
  onAddField?: (field: ExtractedField) => void;
  onDeleteField?: (fieldId: string) => void;
}

export function PdfCanvasViewer({
  document,
  fields,
  activeFieldId,
  hoveredFieldId,
  currentPage,
  onPageChange,
  onSelectField,
  onHoverField,
  onAddField,
  onDeleteField,
}: PdfCanvasViewerProps) {
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [draftBox, setDraftBox] = useState<NormalizedBBox | null>(null);
  const [showNewFieldForm, setShowNewFieldForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<FieldCategory>('Custom Annotations');

  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const prevActiveFieldIdRef = useRef<string | null>(activeFieldId);

  const maxFieldPage = Math.max(
    1,
    fields.reduce((max, f) => Math.max(max, f.page_number || 1), 1)
  );
  const totalPageCount = document.isDemo
    ? Math.max(document.page_count || 1, maxFieldPage)
    : maxFieldPage;

  const existingCategories = Array.from(
    new Set([
      ...fields.map((f) => (f.category || '').trim()).filter(Boolean),
      'Custom Annotations',
      'General Information',
      'Key Terms & Details',
      'Financial Totals & Pricing',
    ])
  );

  useEffect(() => {
    if (currentPage > totalPageCount) {
      onPageChange(totalPageCount);
    }
  }, [currentPage, totalPageCount, onPageChange]);

  const hoveredField = fields.find((f) => f.id === hoveredFieldId) || null;
  const activeField = fields.find((f) => f.id === activeFieldId) || null;
  const focusedField = hoveredField || activeField || fields[0] || null;
  const isFocusedOnDifferentPage =
    focusedField !== null && focusedField.page_number !== currentPage;

  const handleManualPageSwitch = (targetPage: number) => {
    const clampedPage = Math.max(1, Math.min(totalPageCount, targetPage));
    onPageChange(clampedPage);
    const firstFieldOnTargetPage = fields.find((f) => f.page_number === clampedPage);
    if (firstFieldOnTargetPage) {
      prevActiveFieldIdRef.current = firstFieldOnTargetPage.id;
      onSelectField(firstFieldOnTargetPage.id);
    }
  };

  // GSAP Hardware-Accelerated Scale Transform
  useGSAP(
    () => {
      if (!pageContainerRef.current) return;
      gsap.to(pageContainerRef.current, {
        scale: zoomScale,
        duration: 0.28,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    },
    { dependencies: [zoomScale], scope: containerRef }
  );

  // Auto-switch page & container-isolated scroll ONLY when activeFieldId itself changes
  useEffect(() => {
    if (!activeFieldId) return;
    const didActiveFieldChange = prevActiveFieldIdRef.current !== activeFieldId;
    prevActiveFieldIdRef.current = activeFieldId;

    const targetField = fields.find((f) => f.id === activeFieldId);
    if (targetField) {
      if (didActiveFieldChange && targetField.page_number !== currentPage) {
        onPageChange(targetField.page_number);
      }
      const timer = setTimeout(() => {
        const container = containerRef.current;
        const boxElem = window.document.getElementById(`bbox-${activeFieldId}`);
        if (boxElem && container) {
          const containerRect = container.getBoundingClientRect();
          const boxRect = boxElem.getBoundingClientRect();
          if (boxRect.top < containerRect.top + 20) {
            container.scrollTo({
              top: container.scrollTop + (boxRect.top - containerRect.top) - 32,
              behavior: 'smooth',
            });
          } else if (boxRect.bottom > containerRect.bottom - 20) {
            container.scrollTo({
              top: container.scrollTop + (boxRect.bottom - containerRect.bottom) + 32,
              behavior: 'smooth',
            });
          }
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeFieldId, fields, currentPage, onPageChange]);

  const handleZoom = (delta: number) => {
    setZoomScale((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.6), 2.2));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawMode || showNewFieldForm || !pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setDragStart({ x: px, y: py });
    setDraftBox(toNormalizedBBox(px, py, 2, 2, rect.width, rect.height));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawMode || !dragStart || showNewFieldForm || !pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    const left = Math.min(dragStart.x, curX);
    const top = Math.min(dragStart.y, curY);
    const width = Math.max(16, Math.abs(curX - dragStart.x));
    const height = Math.max(14, Math.abs(curY - dragStart.y));
    setDraftBox(toNormalizedBBox(left, top, width, height, rect.width, rect.height));
  };

  const handleMouseUp = () => {
    if (!isDrawMode || !dragStart || !draftBox) return;
    setDragStart(null);
    if (draftBox.w >= 0.03 && draftBox.h >= 0.02) {
      setShowNewFieldForm(true);
      setNewLabel('Custom Audit Anchor');
      setNewValue('');
    } else {
      setDraftBox(null);
    }
  };

  const handleCreateCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftBox || !onAddField || !newLabel.trim() || !newValue.trim()) return;

    const newField: ExtractedField = {
      id: `f-custom-${Date.now().toString().slice(-5)}`,
      document_id: document.id,
      tenant_id: document.tenant_id,
      field_key: newLabel.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      label: newLabel.trim(),
      field_value: newValue.trim(),
      confidence: 1.0,
      page_number: currentPage,
      bbox: draftBox,
      status: 'verified',
      category: newCategory,
      audited_by: 'Local Reviewer',
      updated_at: new Date().toISOString(),
    };

    onAddField(newField);
    onSelectField(newField.id);
    setDraftBox(null);
    setShowNewFieldForm(false);
    setIsDrawMode(false);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0F19]/90 shadow-[0_8px_32px_0_rgba(0,0,0,0.42),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      {/* Top Stage Control Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/[0.07] bg-white/[0.015] px-4 py-2.5 z-20 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-mono tracking-tight tabular-nums text-slate-300">
            <Eye className="h-3.5 w-3.5 text-sky-400" />
            Page {currentPage} of {totalPageCount}
          </span>
          {totalPageCount > 1 && (
            <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#07090E]/80 p-0.5 gap-0.5 max-w-[240px] overflow-x-auto no-scrollbar">
              {Array.from({ length: totalPageCount }, (_, idx) => idx + 1).map(
                (pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handleManualPageSwitch(pageNum)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold transition-all shrink-0 ${
                      currentPage === pageNum
                        ? 'bg-sky-500/25 text-sky-300 border border-sky-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    P{pageNum}
                  </button>
                )
              )}
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleManualPageSwitch(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 transition-colors"
              title="Previous Page ([)"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleManualPageSwitch(currentPage + 1)}
              disabled={currentPage >= totalPageCount}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 transition-colors"
              title="Next Page (])"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Draw Custom Box + Zoom Controls */}
        <div className="flex items-center gap-2">
          {onAddField && (
            <button
              type="button"
              onClick={() => {
                setIsDrawMode((prev) => !prev);
                setDraftBox(null);
                setShowNewFieldForm(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
                isDrawMode
                  ? 'border-sky-400 bg-sky-500/20 text-white shadow-[0_0_16px_rgba(56,189,248,0.25)]'
                  : 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
              }`}
              title="Click and drag on the document page to add a new highlighted field"
            >
              <PlusSquare className="h-3.5 w-3.5 text-sky-400" />
              <span>{isDrawMode ? 'Drag on Page...' : '+ Add Field Box'}</span>
            </button>
          )}

          <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
            <button
              onClick={() => handleZoom(-0.15)}
              className="rounded p-1 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoomScale(1.0)}
              className="px-2 font-mono tracking-tight tabular-nums text-xs text-slate-300 hover:text-white"
              title="Reset Zoom"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              onClick={() => handleZoom(0.15)}
              className="rounded p-1 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => setZoomScale(1.12)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
            title="Fit Width"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Document Viewport Stage */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-y-auto overflow-x-hidden p-5 flex justify-center bg-[#07090E]/70"
      >
        <div
          ref={pageContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => onHoverField(null)}
          style={{ transformOrigin: 'top center' }}
          className={`relative max-w-[680px] w-full aspect-[1/1.414] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.65)] border border-white/[0.09] bg-[#090C14]/95 text-slate-100 overflow-hidden select-none before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:border-t before:border-white/10 ${
            isDrawMode ? 'cursor-crosshair ring-1 ring-sky-400/40' : ''
          }`}
        >
          {/* Modular Coordinate-Locked Document Renderer */}
          <DocumentPageRenderer
            document={document}
            fields={fields}
            currentPage={currentPage}
            activeFieldId={activeFieldId}
            hoveredFieldId={hoveredFieldId}
          />

          {/* Synchronized Bounding Box Overlay Layer */}
          <BoundingBoxLayer
            fields={fields}
            pageNumber={currentPage}
            activeFieldId={activeFieldId}
            hoveredFieldId={hoveredFieldId}
            onSelectField={onSelectField}
            onHoverField={onHoverField}
            onDeleteField={onDeleteField}
          />

          {/* Live Draft Bounding Box while Drawing */}
          {draftBox && (
            <div
              style={{
                left: `${draftBox.x * 100}%`,
                top: `${draftBox.y * 100}%`,
                width: `${draftBox.w * 100}%`,
                height: `${draftBox.h * 100}%`,
              }}
              className="pointer-events-none absolute z-40 rounded border-2 border-dashed border-sky-400 bg-sky-400/20 shadow-[0_0_20px_rgba(56,189,248,0.35)]"
            />
          )}

          {/* Inline Modal Form to Save Newly Drawn Bounding Box */}
          {showNewFieldForm && draftBox && (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute inset-x-6 bottom-6 z-50 rounded-2xl border border-white/20 bg-[#07090E]/95 p-4 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-mono font-semibold text-sky-300">
                  Add New Extracted Field
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftBox(null);
                    setShowNewFieldForm(false);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreateCustomField} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Field Label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  required
                  className="rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Extracted Value (e.g. $12,400.00)"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  required
                  autoFocus
                  className="rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-xs font-mono text-white focus:border-sky-400 focus:outline-none"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    list="existing-categories-list"
                    placeholder="Category (e.g. Key Terms)"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                  <datalist id="existing-categories-list">
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#07090E] hover:bg-slate-200"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-white/[0.015] px-4 py-2 text-[11px] font-mono tracking-tight tabular-nums text-slate-400 z-20 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-slate-200 truncate">
            <Crosshair className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            {isDrawMode
              ? 'Click & drag on the page to highlight a new field'
              : focusedField
              ? `Selected: ${focusedField.label}`
              : 'Ready'}
          </span>
          {focusedField && !isDrawMode && isFocusedOnDifferentPage && (
            <button
              type="button"
              onClick={() => onPageChange(focusedField.page_number)}
              className="rounded border border-sky-400/35 bg-sky-500/15 px-1.5 py-0.5 text-[10px] text-sky-300 hover:bg-sky-500/25 shrink-0"
            >
              Jump to Page {focusedField.page_number} ↗
            </button>
          )}
          {focusedField && !isDrawMode && onDeleteField && (
            <button
              type="button"
              onClick={() => onDeleteField(focusedField.id)}
              className="inline-flex items-center gap-1 rounded border border-rose-400/35 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 shrink-0 transition-colors"
              title="Remove this field box from the document (Delete / Backspace)"
            >
              <Trash2 className="h-2.5 w-2.5" />
              <span>Remove Box</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span>{document.isDemo ? 'DEMO SAMPLE' : 'YOUR UPLOAD'}</span>
          <span className="text-sky-300">ZOOM: {(zoomScale * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
