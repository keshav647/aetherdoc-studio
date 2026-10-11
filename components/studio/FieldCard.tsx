'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ExtractedField } from '@/lib/extraction/types';
import { getConfidenceTier } from '@/lib/extraction/normalizer';
import { useAppStore } from '@/store/useAppStore';
import {
  Check,
  AlertTriangle,
  Edit2,
  History,
  CheckCircle2,
  AlertCircle,
  Crosshair,
  Trash2,
} from 'lucide-react';

interface FieldCardProps {
  field: ExtractedField;
  currentPage?: number;
  isActive: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  onUpdateValue: (
    fieldId: string,
    newValue: string,
    action: 'OVERRIDE' | 'CONFIRM' | 'FLAG'
  ) => void;
  onDeleteField?: (fieldId: string) => void;
  onOpenAuditHistory: (field: ExtractedField) => void;
}

export const FieldCard = React.memo(function FieldCard({
  field,
  currentPage,
  isActive,
  isHovered,
  onSelect,
  onHover,
  onUpdateValue,
  onDeleteField,
  onOpenAuditHistory,
}: FieldCardProps) {
  const { thresholds } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.field_value);
  const cardRef = useRef<HTMLDivElement>(null);
  const tier = getConfidenceTier(
    field.confidence,
    thresholds.highConfidence,
    thresholds.anomalyThreshold
  );

  useEffect(() => {
    setEditValue(field.field_value);
  }, [field.field_value]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editValue.trim() && editValue !== field.field_value) {
      onUpdateValue(field.id, editValue, 'OVERRIDE');
    }
    setIsEditing(false);
  };

  const handleQuickConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateValue(field.id, field.field_value, 'CONFIRM');
  };

  const handleQuickFlag = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateValue(field.id, field.field_value, 'FLAG');
  };

  const dotColorClass =
    field.status === 'flagged' || tier.tier === 'anomaly'
      ? 'bg-rose-400'
      : field.status === 'verified' || tier.tier === 'high'
      ? 'bg-emerald-400'
      : 'bg-amber-400';

  const badgeTextColorClass =
    field.status === 'flagged' || tier.tier === 'anomaly'
      ? 'text-rose-400'
      : field.status === 'verified' || tier.tier === 'high'
      ? 'text-emerald-400'
      : 'text-amber-400';

  const isDifferentPage = currentPage !== undefined && field.page_number !== currentPage;

  return (
    <div
      ref={cardRef}
      id={`field-card-${field.id}`}
      onClick={onSelect}
      onMouseEnter={() => {
        if (!isHovered) onHover(true);
      }}
      className={`group relative rounded-xl border p-3.5 cursor-pointer transition-colors duration-150 ${
        isActive
          ? 'border-sky-400/55 bg-white/[0.07] shadow-[0_6px_22px_0_rgba(0,0,0,0.42)] ring-1 ring-sky-400/25'
          : isHovered
          ? 'border-white/[0.18] bg-white/[0.05]'
          : 'border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04]'
      }`}
    >
      {/* Top Meta Line: Page Tag, Field Label, & Confidence Pill */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`rounded-md border px-1.5 py-0.5 font-mono tracking-tight tabular-nums text-[10px] shrink-0 ${
              isDifferentPage
                ? 'border-sky-400/30 bg-sky-500/10 text-sky-300'
                : 'border-white/[0.08] bg-white/[0.05] text-slate-300'
            }`}
            title={
              isDifferentPage
                ? `Located on Page ${field.page_number} (click to switch page)`
                : `Page ${field.page_number}`
            }
          >
            P{field.page_number}
            {isDifferentPage ? ' ↗' : ''}
          </span>
          <span className="text-xs font-medium text-slate-200 truncate">{field.label}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 font-mono tracking-tight tabular-nums text-[10px] font-medium">
            <span className={`h-1.5 w-1.5 rounded-full ${dotColorClass}`} />
            <span className={badgeTextColorClass}>{(field.confidence * 100).toFixed(1)}%</span>
          </span>
          {field.status === 'verified' && (
            <span title="Auditor Verified">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </span>
          )}
          {field.status === 'flagged' && (
            <span title="Flagged Anomaly">
              <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
            </span>
          )}
        </div>
      </div>

      {/* Extracted Value or In-line Edit Form */}
      {isEditing ? (
        <form
          onSubmit={handleSaveEdit}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 space-y-2"
        >
          <textarea
            rows={editValue.length > 65 ? 3 : 2}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-white/20 bg-[#07090E]/90 px-2.5 py-1.5 font-mono tracking-tight tabular-nums text-xs text-white focus:outline-none focus:border-sky-400 resize-y"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg px-2.5 py-1 text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#07090E] hover:bg-slate-200 transition-colors"
            >
              Save Override
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-2.5 mt-1 min-w-0">
          <p className="font-mono tracking-tight tabular-nums text-xs font-medium text-white break-words whitespace-pre-wrap leading-relaxed flex-1 min-w-0">
            {field.field_value}
          </p>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-0.5 opacity-85 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
              title="Edit value"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAuditHistory(field);
              }}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.08] hover:text-sky-300 transition-colors"
              title="Audit trail"
            >
              <History className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleQuickFlag}
              className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 transition-colors"
              title="Flag anomaly"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleQuickConfirm}
              className="rounded-lg p-1 text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-400 transition-colors"
              title="Confirm as verified"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            {onDeleteField && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteField(field.id);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                title="Remove field box (Delete / Backspace)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Normalized Coordinate Telemetry Readout & Confidence Bar */}
      <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-mono tracking-tight tabular-nums text-[10px] text-slate-500">
          <Crosshair className="h-2.5 w-2.5 text-slate-500" />
          x:{field.bbox.x.toFixed(2)} y:{field.bbox.y.toFixed(2)} w:{field.bbox.w.toFixed(2)}
        </span>

        <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full ${dotColorClass}`}
            style={{ width: `${Math.round(field.confidence * 100)}%` }}
          />
        </div>
      </div>

      {/* Auditor Attribution */}
      {field.audited_by && (
        <p className="mt-2 text-[10px] font-mono tracking-tight text-emerald-300/80 flex items-center gap-1">
          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" /> Attested by {field.audited_by}
        </p>
      )}
    </div>
  );
});
