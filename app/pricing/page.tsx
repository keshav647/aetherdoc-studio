'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Shield,
  Sparkles,
  ArrowRight,
  Database,
  Lock,
  Cpu,
  Layers,
  HelpCircle,
} from 'lucide-react';

const TIERS = [
  {
    name: 'Foundation',
    tagline: 'For fast-growing engineering teams proving automated intelligence.',
    monthlyPrice: '$2,400',
    annualPrice: '$1,950',
    period: '/month',
    ctaText: 'Start Foundation Trial',
    ctaHref: '/login',
    popular: false,
    features: [
      'Up to 15,000 document pages / month',
      'Dual-Pane HITL Verification Studio (3 Seats)',
      'Shared PostgreSQL pgvector Cluster',
      'Row Level Security (RLS) Tenant Isolation',
      'Pre-built Financial & Legal Schema Parsers',
      'Standard 99.2% Extraction SLA',
      'REST & Webhook Dispatch Pipeline',
      'Community & Slack Support',
    ],
  },
  {
    name: 'Enterprise Scale',
    tagline: 'For high-throughput organizations demanding strict compliance & sub-second latency.',
    monthlyPrice: '$6,800',
    annualPrice: '$5,500',
    period: '/month',
    ctaText: 'Deploy Enterprise Scale',
    ctaHref: '/dashboard',
    popular: true,
    features: [
      'Up to 120,000 document pages / month',
      'Unlimited HITL Verification Auditor Seats',
      'Dedicated pgvector & tsvector Hybrid Engine',
      'Bring Your Own Key (BYOK) Encryption',
      'Custom LLM Integration (Gemini, Claude, GPT-4o)',
      'Sub-millimeter Spatial Bounding Box Guarantee',
      'SOC 2 Type II Attestation Packet & BAA',
      '99.95% Financial Grade Uptime SLA',
      'Dedicated Solutions Architect & 1hr Response',
    ],
  },
  {
    name: 'Sovereign VPC',
    tagline: 'For regulated banks, healthcare institutions, and defense enterprises.',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    period: 'annual contract',
    ctaText: 'Talk to Infrastructure Architects',
    ctaHref: '/settings',
    popular: false,
    features: [
      'Uncapped page volume with tiered discounting',
      'Air-gapped on-premise or Private VPC Deployment',
      'Single-Tenant Dedicated PostgreSQL Instance',
      'Hardware Security Module (HSM / KMS) Integration',
      'Custom Deep-Domain NER Fine-Tuning Models',
      'FedRAMP & HIPAA Audited Enclaves',
      'Zero Data Retention (ZDR) Guarantees',
      '24/7/365 White-Glove Mission Control Support',
      'Custom ERP & Core Banking Direct Bridges',
    ],
  },
];

const FAQS = [
  {
    q: 'How does Cortexa enforce Zero Data Leakage between tenants?',
    a: 'Every query executes through PostgreSQL Row Level Security (RLS) policies locked to cryptographic tenant UUIDs. Neither prompt data nor embeddings are shared across boundaries, and all customer data can be encrypted with customer-managed keys (BYOK).',
  },
  {
    q: 'What is the Human-in-the-Loop (HITL) verification workflow?',
    a: 'Any extraction with confidence falling below your SLA threshold (e.g., 95%) is immediately queued into the dual-pane verification studio, where certified auditors review spatial bounding boxes side-by-side with raw documents before ledger write-back.',
  },
  {
    q: 'Can we connect our own Supabase or PostgreSQL pgvector instances?',
    a: 'Yes. Via our Bring Your Own Key & Database (BYOK) settings, you can route extractions, embeddings, and audit logs directly into your existing cloud infrastructure without leaving your cloud perimeter.',
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  return (
    <div className="min-h-screen bg-[#030508] text-slate-100 font-sans selection:bg-sky-500/20 selection:text-sky-200">
      {/* Floating Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#030508]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.1] text-sky-400 font-serif text-lg font-bold">
              Ω
            </span>
            <span className="text-base font-semibold tracking-tight text-white font-sans">
              Cortexa
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-300">
            <Link href="/" className="hover:text-white transition-colors">Platform</Link>
            <Link href="/documents" className="hover:text-white transition-colors">Signals</Link>
            <Link href="/search" className="hover:text-white transition-colors">Hybrid Search</Link>
            <Link href="/pricing" className="text-white font-semibold">Pricing</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#030508] px-4 py-1.5 text-xs font-semibold hover:bg-slate-200 transition-all shadow-subtle-card"
            >
              <span>Console</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Pricing Header */}
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-1 text-xs text-slate-300 backdrop-blur-xl mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="font-mono text-[11px] tracking-wide text-slate-300">
            TRANSPARENT ENTERPRISE ARCHITECTURE
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-editorial font-normal tracking-tight text-white max-w-3xl mx-auto">
          Predictable scale for mission-critical intelligence.
        </h1>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          From fast-growing compliance teams to global sovereign institutions. Single-tenant RLS, pgvector indexing, and precision HITL verification built-in.
        </p>

        {/* Annual / Monthly Toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span className={`text-xs ${billingCycle === 'monthly' ? 'text-white font-semibold' : 'text-slate-400'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle((prev) => (prev === 'annual' ? 'monthly' : 'annual'))}
            className="relative h-6 w-12 rounded-full bg-white/[0.08] border border-white/[0.12] p-0.5 transition-colors"
          >
            <div
              className={`h-4.5 w-4.5 rounded-full bg-white transition-transform ${
                billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-xs flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-white font-semibold' : 'text-slate-400'}`}>
            Annual
            <span className="rounded bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 font-mono text-[10px] text-sky-300">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                tier.popular
                  ? 'border border-sky-400/30 bg-[#05070B] shadow-[0_20px_60px_rgba(56,189,248,0.08)]'
                  : 'border border-white/[0.07] bg-[#05070B]/70 hover:border-white/[0.12]'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-sky-400 text-[#030508] px-3.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide">
                    MOST ARCHITECTED
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-xl font-semibold text-white tracking-tight">{tier.name}</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed min-h-[36px]">
                  {tier.tagline}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-editorial text-4xl sm:text-5xl font-normal text-white">
                    {billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{tier.period}</span>
                </div>

                <div className="mt-8 pt-6 border-t border-white/[0.06] space-y-3.5">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Included Capabilities
                  </p>
                  {tier.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <Check className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <Link
                  href={tier.ctaHref}
                  className={`w-full flex items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold transition-all ${
                    tier.popular
                      ? 'bg-white text-[#030508] hover:bg-slate-200 shadow-subtle-card'
                      : 'border border-white/[0.1] bg-white/[0.03] text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{tier.ctaText}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className="mt-28 max-w-3xl mx-auto">
          <h3 className="text-2xl font-editorial font-normal text-white text-center mb-10">
            Frequently Asked Architecture Questions
          </h3>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 backdrop-blur-xl"
              >
                <h4 className="text-sm font-semibold text-white mb-2">{faq.q}</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-12 px-6 text-center text-xs text-slate-400 font-mono">
        <p>© 2026 Cortexa Intelligence Inc. All rights reserved. Zero-Data-Leakage Cryptographic Architecture.</p>
      </footer>
    </div>
  );
}
