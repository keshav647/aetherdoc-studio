'use client';

import React from 'react';
import { ExtractedField } from '@/lib/extraction/types';
import { bboxToPercentStyle, getConfidenceTier } from '@/lib/extraction/normalizer';
import { useAppStore } from '@/store/useAppStore';
import { X } from 'lucide-react';

interface BoundingBoxLayerProps {
  fields: ExtractedField[];
  pageNumber: number;
  activeFieldId: string | null;
  hoveredFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onHoverField: (fieldId: string | null) => void;
  onDeleteField?: (fieldId: string) => void;
}

export function BoundingBoxLayer({
  fields,
  pageNumber,
  activeFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
  onDeleteField,
}: BoundingBoxLayerProps) {
  const { thresholds } = useAppStore();
  const pageFields = fields.filter((f) => f.page_number === pageNumber);

  return (
    <div className="pointer-events-none absolute inset-0 h-full w-full select-none">
      {pageFields.map((field) => {
        const isActive = activeFieldId === field.id;
        const isHovered = hoveredFieldId === field.id;

        const tier = getConfidenceTier(
          field.confidence,
          thresholds.highConfidence,
          thresholds.anomalyThreshold
        );
        const style = bboxToPercentStyle(field.bbox);

        const isFlagged = field.status === 'flagged' || tier.tier === 'anomaly';
        const isVerified = field.status === 'verified' || tier.tier === 'high';

        let boxClass =
          'cursor-pointer pointer-events-auto rounded-[6px] transition-colors duration-150 ';
        if (isFlagged) {
          boxClass += isActive
            ? 'z-30 bbox-crimson bbox-active bg-rose-500/[0.11]'
            : isHovered
            ? 'z-20 border border-rose-400/85 bg-rose-500/[0.09] shadow-[0_0_14px_rgba(239,68,68,0.2)]'
            : 'z-10 bbox-crimson hover:bg-rose-500/[0.07]';
        } else if (isVerified) {
          boxClass += isActive
            ? 'z-30 bbox-mint bbox-active bg-emerald-500/[0.11]'
            : isHovered
            ? 'z-20 border border-emerald-400/85 bg-emerald-500/[0.09] shadow-[0_0_14px_rgba(16,185,129,0.2)]'
            : 'z-10 bbox-mint hover:bg-emerald-500/[0.07]';
        } else {
          boxClass += isActive
            ? 'z-30 bbox-amber bbox-active bg-amber-500/[0.11]'
            : isHovered
            ? 'z-20 border border-amber-400/85 bg-amber-500/[0.09] shadow-[0_0_14px_rgba(245,158,11,0.18)]'
            : 'z-10 bbox-amber hover:bg-amber-500/[0.07]';
        }

        return (
          <div
            key={field.id}
            id={`bbox-${field.id}`}
            style={style}
            onClick={(e) => {
              e.stopPropagation();
              onSelectField(field.id);
            }}
            onMouseEnter={() => {
              if (hoveredFieldId !== field.id) {
                onHoverField(field.id);
              }
            }}
            className={`absolute flex flex-col justify-start overflow-visible ${boxClass}`}
          >
            {/* Corner Reticle Target Markers & Remove Box Button on Active / Hover */}
            {(isActive || isHovered) && (
              <>
                <span className="pointer-events-none absolute -top-[1.5px] -left-[1.5px] h-2 w-2 border-t-2 border-l-2 border-white/95 rounded-tl-[2px]" />
                <span className="pointer-events-none absolute -top-[1.5px] -right-[1.5px] h-2 w-2 border-t-2 border-r-2 border-white/95 rounded-tr-[2px]" />
                <span className="pointer-events-none absolute -bottom-[1.5px] -left-[1.5px] h-2 w-2 border-b-2 border-l-2 border-white/95 rounded-bl-[2px]" />
                <span className="pointer-events-none absolute -bottom-[1.5px] -right-[1.5px] h-2 w-2 border-b-2 border-r-2 border-white/95 rounded-br-[2px]" />
                {onDeleteField && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteField(field.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="pointer-events-auto absolute -top-2.5 -right-2.5 z-40 flex h-5 w-5 items-center justify-center rounded-full border border-rose-400/60 bg-[#07090E] text-rose-300 hover:bg-rose-500 hover:text-white hover:border-rose-400 shadow-lg transition-colors"
                    title={`Remove field box "${field.label}" (Delete / Backspace)`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
