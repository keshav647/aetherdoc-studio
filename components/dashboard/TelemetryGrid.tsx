'use client';

import React from 'react';
import { TelemetryKPIs } from '@/lib/extraction/types';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileCheck2,
  Activity,
} from 'lucide-react';

interface TelemetryGridProps {
  telemetry: TelemetryKPIs;
}

export function TelemetryGrid({ telemetry }: TelemetryGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Average Extraction Confidence */}
      <LiquidGlassCard className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-medium text-slate-400">
            Average Confidence
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="font-mono text-3xl font-bold tracking-tight text-white tabular-nums">
            {telemetry.globalAccuracy}%
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-white/[0.04] text-sky-300 border border-white/[0.08]">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              High Accuracy
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-400"
              style={{ width: `${telemetry.globalAccuracy}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Target &gt; 90.0%</span>
            <span className="text-slate-300 font-medium">Auto-scored</span>
          </div>
        </div>
      </LiquidGlassCard>

      {/* 2. Average Review Speed */}
      <LiquidGlassCard className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-medium text-slate-400">
            Avg. Review Time
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="font-mono text-3xl font-bold tracking-tight text-white tabular-nums">
            {telemetry.averageReviewTimeSeconds}s
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-white/[0.04] text-slate-300 border border-white/[0.08]">
              Fast Review
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-300"
              style={{
                width: `${Math.min((telemetry.averageReviewTimeSeconds / 60) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Target &lt; 60s / doc</span>
            <span className="text-slate-400">Keyboard Shortcuts</span>
          </div>
        </div>
      </LiquidGlassCard>

      {/* 3. Flagged Fields Rate */}
      <LiquidGlassCard className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-medium text-slate-400">
            Flagged Fields
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="font-mono text-3xl font-bold tracking-tight text-white tabular-nums">
            {telemetry.anomalyRate}%
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-white/[0.04] text-rose-400 border border-white/[0.08]">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Needs Check
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-rose-400/80"
              style={{ width: `${Math.min(telemetry.anomalyRate * 10, 100)}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Highlighted in Studio</span>
            <span className="text-slate-400">&lt; 70% score</span>
          </div>
        </div>
      </LiquidGlassCard>

      {/* 4. Verified Documents */}
      <LiquidGlassCard className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-medium text-slate-400">
            Verified Documents
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300">
            <FileCheck2 className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="font-mono text-3xl font-bold tracking-tight text-white tabular-nums">
            {telemetry.reconciledCount}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            / {telemetry.totalDocuments} total
          </span>
        </div>

        <div className="mt-4">
          <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-400"
              style={{
                width: `${
                  telemetry.totalDocuments > 0
                    ? (telemetry.reconciledCount / telemetry.totalDocuments) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400 font-medium">
              {telemetry.pendingReviewCount} awaiting review
            </span>
            <span className="flex items-center text-slate-400">
              <Activity className="h-3 w-3 mr-1 text-sky-400 inline" />
              Live
            </span>
          </div>
        </div>
      </LiquidGlassCard>
    </div>
  );
}
