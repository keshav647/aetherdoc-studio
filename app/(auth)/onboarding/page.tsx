'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Building2,
  Database,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState('Apex Global Financial Corp');
  const [useSandbox, setUseSandbox] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-obsidian-950 relative overflow-hidden">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-obsidian-900/90 p-8 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/logo.png"
            alt="AetherDoc Studio Logo"
            className="h-10 w-10 rounded-xl object-cover border border-white/[0.14] shadow-[0_0_16px_rgba(56,189,248,0.22)]"
          />
          <div>
            <h1 className="text-base font-bold text-white">AetherDoc Studio Onboarding</h1>
            <p className="text-xs text-slate-400">Step {step} of 3</p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white">Create Tenant Workspace</h2>
            <p className="text-xs text-slate-400">
              Each organization is isolated at the database level with Row-Level Security (RLS).
            </p>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Continue to Database Setup <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white">Database & BYOK Connector</h2>
            <p className="text-xs text-slate-400">
              Select whether to boot into the Sandbox demo environment or connect a live Supabase instance.
            </p>
            <div className="space-y-2">
              <div
                onClick={() => setUseSandbox(true)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  useSandbox
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-white/10 bg-white/[0.02] text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Interactive Sandbox Demo Mode
                  </span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                    Zero Setup
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Includes pre-loaded high-resolution invoices, bounding boxes, and audit history.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep(3)}
              className="w-full mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Initialize Partition <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white">Workspace Ready!</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your tenant partition has been provisioned. Launch the verification studio to inspect your first document.
            </p>
            <button
              onClick={() => router.push('/documents/doc-inv-8941')}
              className="w-full mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-semibold text-white shadow-glow-mint hover:from-emerald-500 hover:to-teal-500"
            >
              Launch Verification Studio <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
