'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAppStore } from '@/store/useAppStore';
import { ParticleSilhouette } from '@/components/landing/ParticleSilhouette';
import { UploadCloud, FileText, Sparkles } from 'lucide-react';

gsap.registerPlugin(useGSAP);

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    documents,
    requestFileConfirmation,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);

  const studioDocId =
    documents.find((d) => !d.isDemo)?.id ||
    documents.find((d) => d.status !== 'verified')?.id ||
    documents[0]?.id ||
    'doc-inv-8941';

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.from('.hero-headline-line', {
        y: 32,
        opacity: 0,
        duration: 0.95,
        stagger: 0.12,
      })
        .from(
          '.hero-upload-card',
          {
            x: 18,
            opacity: 0,
            duration: 0.8,
          },
          '-=0.65'
        )
        .from(
          '.hero-cta-group',
          {
            y: 16,
            opacity: 0,
            duration: 0.75,
            stagger: 0.08,
          },
          '-=0.55'
        )
        .from(
          '.hero-quote',
          {
            opacity: 0,
            y: 12,
            duration: 0.85,
          },
          '-=0.5'
        );
    },
    { scope: heroRef }
  );

  const handleQuickHeroUpload = (file: File) => {
    requestFileConfirmation({
      sourceType: 'local',
      localFile: file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      sourceLabel: 'Local Computer File',
    });
  };

  return (
    <section
      ref={heroRef}
      className="relative h-screen min-h-[740px] w-full overflow-hidden flex flex-col justify-between pt-20 pb-10 px-6 sm:px-8 lg:px-12"
    >
      {/* Full-bleed 3D Particle Silhouette Canvas */}
      <ParticleSilhouette />

      {/* Top/Mid Row: Pushed outward to viewport edges so nothing overlaps the center silhouette */}
      <div className="relative z-10 flex flex-col lg:flex-row items-start justify-between gap-8 w-full max-w-[1680px] mx-auto pt-4">
        <div className="flex flex-col text-left max-w-[400px] xl:max-w-[440px]">
          <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[50px] xl:text-[56px] font-normal tracking-tight text-white leading-[1.06]">
            <span className="hero-headline-line block">Upload your documents.</span>
            <span className="hero-headline-line block text-slate-400 font-normal">
              Verify every field in seconds.
            </span>
          </h1>
        </div>

        {/* Interactive Local Document Drop Card on the right edge (replaces passive testing text) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.[0]) {
              handleQuickHeroUpload(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`hero-upload-card cursor-pointer rounded-2xl border p-4 transition-all w-full max-w-[310px] bg-[#0B0F19]/90 shadow-xl ${
            isDragging
              ? 'border-sky-400 bg-sky-500/10'
              : 'border-white/[0.12] hover:border-sky-400/50 hover:bg-[#0E1422]/95'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv,.json,.md,.png,.jpg,.jpeg,.webp,.xlsx,.pptx,.rtf,.html"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleQuickHeroUpload(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white">
                Quick Upload Local File
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Local scan supports PDF, DOCX, CSV, JSON &amp; TXT. Connect AI Key for images &amp; all formats.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-sky-400">
                <span>Browse your computer</span>
                <span>→</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Constrained left & right side columns well clear of the center figure */}
      <div
        id="hero-cta"
        className="relative z-10 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 w-full max-w-[1680px] mx-auto"
      >
        <div className="flex flex-col text-left space-y-4 max-w-[320px]">
          <p className="hero-cta-group text-xs text-slate-300 font-sans leading-relaxed">
            Extract key numbers, dates, and clauses from your own invoices and contracts — or sync directly with your Supabase database.
          </p>

          <div className="hero-cta-group flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group inline-flex items-center gap-2 rounded-full bg-white text-[#07090E] px-4 py-2.5 text-xs font-semibold hover:bg-slate-200 transition-all shadow-[0_0_24px_rgba(255,255,255,0.15)] active:scale-[0.98]"
            >
              <UploadCloud className="h-3.5 w-3.5 text-[#07090E]" />
              <span>Upload Your Document</span>
            </button>

            <Link
              href={`/documents/${studioDocId}`}
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-[#0B0F19]/85 text-slate-200 hover:text-white hover:border-white/25 px-4 py-2.5 text-xs font-medium transition-all"
            >
              <FileText className="h-3.5 w-3.5 text-sky-400" />
              <span>Try Demo Studio</span>
            </Link>
          </div>
        </div>

        <div className="hero-quote flex flex-col lg:items-end text-left lg:text-right max-w-[280px]">
          <p className="font-editorial italic text-2xl sm:text-3xl text-slate-300 font-normal">
            “Built for teams who ask why.”
          </p>
          <p className="font-mono text-[10px] tracking-widest uppercase text-slate-400 mt-1 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-sky-400" />
            <span>Local Uploads • Supabase Cloud Sync</span>
          </p>
        </div>
      </div>
    </section>
  );
}
