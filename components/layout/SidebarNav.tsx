'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, LayoutGroup } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import {
  LayoutDashboard,
  FileText,
  Search,
  Settings,
  KeyRound,
  Building2,
  Layers,
  ChevronDown,
  UserCheck,
  Cloud,
} from 'lucide-react';
import { SupabaseLogo } from '@/components/common/SupabaseSyncModal';
import { CLOUD_PROVIDERS } from '@/components/common/CloudStorageModal';

interface SidebarNavProps {
  onOpenByok: () => void;
  onOpenSupabase: () => void;
  onOpenCloudStorage?: () => void;
}

export function SidebarNav({
  onOpenByok,
  onOpenSupabase,
  onOpenCloudStorage,
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    documents,
    hideDemoSamples,
    tenants,
    activeTenant,
    switchTenant,
    user,
    updateUserProfile,
    byokConfig,
    setCloudStorageModalOpen,
  } = useAppStore();

  const visibleDocuments = hideDemoSamples
    ? documents.filter((d) => !d.isDemo)
    : documents;
  const pendingDocs = visibleDocuments.filter((d) => d.status !== 'verified');
  const studioTargetDocId =
    pendingDocs[0]?.id || visibleDocuments[0]?.id || documents[0]?.id || 'doc-inv-8941';

  const navItems = [
    {
      id: 'console',
      label: 'Dashboard & Upload',
      href: '/dashboard',
      matchPrefix: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'ledger',
      label: 'Documents',
      href: '/documents',
      matchPrefix: '/documents',
      exact: true,
      icon: FileText,
      badge: visibleDocuments.length,
    },
    {
      id: 'studio',
      label: 'Review Studio',
      href: `/documents/${studioTargetDocId}`,
      matchPrefix: '/documents/',
      icon: Layers,
      badge: pendingDocs.length > 0 ? `${pendingDocs.length} Pending` : 'Verified',
    },
    {
      id: 'search',
      label: 'Smart Search',
      href: '/search',
      matchPrefix: '/search',
      icon: Search,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      matchPrefix: '/settings',
      icon: Settings,
      badge: null,
    },
  ];

  const activeAiKey =
    byokConfig.geminiApiKey?.trim() ||
    byokConfig.openaiApiKey?.trim() ||
    byokConfig.llmApiKey?.trim() ||
    '';
  const hasAiKey = Boolean(activeAiKey);
  const detectedProviderLabel = activeAiKey
    ? activeAiKey.startsWith('AIza')
      ? 'Google Gemini'
      : activeAiKey.startsWith('sk-ant-')
      ? 'Claude AI'
      : activeAiKey.startsWith('gsk_')
      ? 'Groq AI'
      : activeAiKey.startsWith('sk-or-')
      ? 'OpenRouter'
      : activeAiKey.startsWith('sk-')
      ? 'OpenAI'
      : byokConfig.detectedProviderName || 'AI Connected'
    : 'Local Engine';

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.06] bg-[#07090E]/92 md:flex md:flex-col justify-between p-4">
      <div>
        {/* Brand Logo */}
        <div
          onClick={() => router.push('/')}
          className="group cursor-pointer flex items-center justify-between px-2 py-3 border-b border-white/[0.06]"
        >
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="AetherDoc Studio Logo"
              className="h-8 w-8 rounded-lg object-cover border border-white/[0.12] shadow-[0_0_14px_rgba(56,189,248,0.22)] group-hover:border-sky-400/60 transition-all"
            />
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                AetherDoc{' '}
                <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-sky-300 font-mono border border-white/[0.08]">
                  STUDIO
                </span>
              </h1>
              <p className="text-[10px] text-slate-400">Document Extraction &amp; Review</p>
            </div>
          </div>
        </div>

        {/* Interactive Workspace Selector */}
        <div className="mt-4 px-1">
          <div className="relative rounded-xl border border-white/[0.08] bg-[#0B0F19]/90 p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-mono">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-sky-400" />
                WORKSPACE
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Active
              </span>
            </div>
            <div className="relative flex items-center">
              <select
                value={activeTenant.id}
                onChange={(e) => switchTenant(e.target.value)}
                aria-label="Select Workspace"
                className="w-full appearance-none cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03] pl-2.5 pr-6 py-1 text-xs font-medium text-white hover:border-white/20 focus:outline-none transition-colors truncate"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#07090E] text-white">
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Navigation Links with Shared Layout Pill */}
        <LayoutGroup id="sidebarNavGroup">
          <nav className="mt-5 space-y-1 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.matchPrefix);

              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className={`relative flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebarActivePill"
                      transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/[0.10] shadow-sm"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== null && (
                    <span className="relative z-10 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] tracking-tight tabular-nums text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </LayoutGroup>
      </div>

      {/* Sidebar Footer: Cloud Object Storage + Supabase Button + AI Keys Button + Editable Reviewer Name */}
      <div className="space-y-2 px-1 border-t border-white/[0.06] pt-4">
        {/* Universal Cloud Object Storage Button (Cloudflare R2 / S3 / Azure / GCS) */}
        {(() => {
          const activeCloudMeta =
            CLOUD_PROVIDERS.find((p) => p.id === byokConfig.cloudStorage?.provider) ||
            CLOUD_PROVIDERS[0];
          const isCloudConnected = Boolean(byokConfig.cloudStorage?.isConnected);
          return (
            <button
              onClick={() => {
                if (onOpenCloudStorage) onOpenCloudStorage();
                else setCloudStorageModalOpen(true);
              }}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                isCloudConnected
                  ? activeCloudMeta.badgeColor
                  : 'border-orange-400/35 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
              }`}
            >
              <span className="flex items-center gap-2">
                <Cloud
                  className={`h-3.5 w-3.5 ${
                    isCloudConnected ? activeCloudMeta.accentTextClass : 'text-orange-400'
                  }`}
                />
                <span>
                  {isCloudConnected
                    ? activeCloudMeta.shortName
                    : 'Connect Object Storage'}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isCloudConnected ? activeCloudMeta.dotClass : 'bg-slate-400'
                  }`}
                />
                {isCloudConnected ? 'Connected' : 'Connect'}
              </span>
            </button>
          );
        })()}

        {/* Official Supabase Button (#3ECF8E + Lightning Bolt SVG) */}
        <button
          onClick={onOpenSupabase}
          className="flex w-full items-center justify-between rounded-xl border border-[#3ECF8E]/35 bg-[#3ECF8E]/10 px-3 py-2 text-xs font-semibold text-[#3ECF8E] hover:bg-[#3ECF8E]/20 transition-colors"
        >
          <span className="flex items-center gap-2">
            <SupabaseLogo className="h-3.5 w-3.5" />
            <span>Supabase Cloud</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[#3ECF8E]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                byokConfig.isSupabaseConnected ? 'bg-[#3ECF8E]' : 'bg-slate-400'
              }`}
            />
            {byokConfig.isSupabaseConnected ? 'Connected' : 'Connect'}
          </span>
        </button>

        {/* Universal AI API Key Button */}
        <button
          onClick={onOpenByok}
          className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-sky-400" />
            <span>AI API Keys</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-slate-300">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                hasAiKey ? 'bg-emerald-400' : 'bg-sky-400'
              }`}
            />
            {detectedProviderLabel}
          </span>
        </button>

        {/* Interactive Reviewer Name Input (stamps Audit Logs & JSON Exports) */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-1">
          <label className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <UserCheck className="h-3 w-3 text-sky-400" />
              REVIEWER NAME
            </span>
            <span className="text-[9px] text-slate-500">Audit Stamp</span>
          </label>
          <input
            type="text"
            value={user.full_name}
            onChange={(e) => updateUserProfile({ full_name: e.target.value })}
            placeholder="Your Name (for Audit Log)"
            className="w-full rounded-lg border border-white/[0.08] bg-[#0B0F19] px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <button
          onClick={() => router.push('/')}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <span>← Landing Page</span>
        </button>
      </div>
    </aside>
  );
}
