'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Sparkles, UserCheck, ArrowRight, Lock, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('e.vance@apex-global.financial');
  const [password, setPassword] = useState('••••••••••••');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  const handleQuickDemoLogin = (role: 'auditor' | 'admin') => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#030508] relative overflow-hidden">
      {/* Background Radial Glows */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-sky-500/5 blur-[140px]" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-cyan-500/4 blur-[140px]" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#05070B] p-8 shadow-2xl backdrop-blur-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.1] text-sky-400 font-serif text-2xl font-bold mb-4 hover:border-sky-400/40 transition-colors">
            Ω
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
            Cortexa <span className="text-sky-300 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">ENTERPRISE</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous Signal Mesh & Sovereign Audit Console
          </p>
        </div>

        {/* 1-Click Demo Auditor Login */}
        <div className="mb-6 space-y-2.5">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('auditor')}
            className="w-full flex items-center justify-between rounded-2xl border border-white/[0.1] bg-white/[0.03] p-3.5 text-xs font-semibold text-white hover:bg-white/[0.06] hover:border-white/20 transition-all shadow-subtle-card group"
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="h-4 w-4 text-sky-400" />
              <div className="text-left">
                <span className="block text-xs font-semibold text-white">1-Click Demo Auditor Access</span>
                <span className="block text-[10px] text-slate-400 font-normal">Elena Vance (Apex Global Capital)</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-obsidian-900 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-mono">
            or password auth
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Corporate Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Encrypted Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-glow-cerulean hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-[0.98]"
          >
            Sign In to Partition
          </button>
        </form>

        <div className="mt-6 text-center text-[11px] text-slate-500">
          Protected by PostgreSQL Engine-Level Row Security (RLS)
        </div>
      </div>
    </div>
  );
}
