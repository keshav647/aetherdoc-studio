import { NormalizedBBox } from './types';

/**
 * Normalizes absolute pixel coordinates from a rendered canvas or PDF page
 * into a resolution-independent 0.0 - 1.0 ratio space.
 */
export function toNormalizedBBox(
  pixelX: number,
  pixelY: number,
  pixelW: number,
  pixelH: number,
  pageWidth: number,
  pageHeight: number
): NormalizedBBox {
  const safeWidth = Math.max(pageWidth, 1);
  const safeHeight = Math.max(pageHeight, 1);

  return {
    x: clamp(pixelX / safeWidth, 0, 1),
    y: clamp(pixelY / safeHeight, 0, 1),
    w: clamp(pixelW / safeWidth, 0, 1),
    h: clamp(pixelH / safeHeight, 0, 1),
  };
}

/**
 * Converts normalized bounding box (0.0 to 1.0) into responsive percentage CSS styles.
 * Ensures the box scales seamlessly with zoom levels, mobile viewports, and high-DPI screens.
 */
export function bboxToPercentStyle(bbox: NormalizedBBox): React.CSSProperties {
  return {
    left: `${(bbox.x * 100).toFixed(3)}%`,
    top: `${(bbox.y * 100).toFixed(3)}%`,
    width: `${(bbox.w * 100).toFixed(3)}%`,
    height: `${(bbox.h * 100).toFixed(3)}%`,
  };
}

/**
 * Evaluates the confidence tier and returns standard Design System tokens.
 * Mint Emerald (>90%), Amber Glow (70-89%), Crimson Neon (<70%).
 */
export function getConfidenceTier(
  confidence: number,
  highThreshold = 0.9,
  anomalyThreshold = 0.7
): {
  tier: 'high' | 'review' | 'anomaly';
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  glowClass: string;
  label: string;
} {
  if (confidence >= highThreshold) {
    return {
      tier: 'high',
      color: '#10B981',
      badgeBg: 'bg-white/[0.04]',
      badgeBorder: 'border-white/[0.08]',
      badgeText: 'text-emerald-400',
      glowClass: 'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
      label: 'Verified / High Confidence',
    };
  }

  if (confidence >= anomalyThreshold) {
    return {
      tier: 'review',
      color: '#F59E0B',
      badgeBg: 'bg-white/[0.04]',
      badgeBorder: 'border-white/[0.08]',
      badgeText: 'text-amber-400',
      glowClass: 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.12)]',
      label: 'Review Required',
    };
  }

  return {
    tier: 'anomaly',
    color: '#EF4444',
    badgeBg: 'bg-white/[0.04]',
    badgeBorder: 'border-white/[0.08]',
    badgeText: 'text-rose-400',
    glowClass: 'border-rose-500/40 bg-rose-500/10 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
    label: 'Anomaly / Flagged',
  };
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}
