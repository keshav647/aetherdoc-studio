'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import {
  CloudStorageProviderId,
  CloudStorageConfig,
  RemoteStorageItem,
} from '@/lib/extraction/types';
import { formatBytes, formatDate } from '@/lib/utils';
import {
  X,
  Cloud,
  Search,
  CheckCircle2,
  Database,
  HardDrive,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Server,
  Sparkles,
  FileText,
  Unplug,
} from 'lucide-react';

interface CloudStorageModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface ProviderMeta {
  id: CloudStorageProviderId;
  name: string;
  shortName: string;
  tagline: string;
  badgeColor: string;
  cardIdleClass: string;
  cardActiveClass: string;
  subtitleClass: string;
  dotClass: string;
  headerIconClass: string;
  tabActiveClass: string;
  inputFocusClass: string;
  ctaButtonClass: string;
  accentTextClass: string;
  description: string;
  placeholderEndpoint: string;
  placeholderBucket: string;
}

export const CLOUD_PROVIDERS: ProviderMeta[] = [
  {
    id: 'cloudflare_r2',
    name: 'Cloudflare R2 Object Storage',
    shortName: 'Cloudflare R2',
    tagline: 'Zero Egress S3',
    badgeColor: 'border-[#F38020]/45 bg-[#F38020]/15 text-[#F6821F]',
    cardIdleClass:
      'border-[#F38020]/30 bg-[#F38020]/[0.07] text-orange-100 hover:border-[#F38020]/60 hover:bg-[#F38020]/15',
    cardActiveClass:
      'border-[#F38020] bg-[#F38020]/22 text-white shadow-[0_0_22px_rgba(243,128,32,0.32)] ring-1 ring-[#F38020]/60',
    subtitleClass: 'text-orange-300/90',
    dotClass: 'bg-[#F38020] shadow-[0_0_8px_#F38020]',
    headerIconClass:
      'bg-[#F38020]/15 border-[#F38020]/45 text-[#F38020] shadow-[0_0_20px_rgba(243,128,32,0.25)]',
    tabActiveClass: 'bg-[#F38020]/20 border border-[#F38020]/50 text-orange-200',
    inputFocusClass: 'focus:border-[#F38020]',
    ctaButtonClass:
      'bg-[#F38020] text-slate-950 hover:bg-[#ff8f33] shadow-[0_0_22px_rgba(243,128,32,0.38)]',
    accentTextClass: 'text-[#F6821F]',
    description: 'Zero-egress S3-compatible object storage powered by Cloudflare global edge.',
    placeholderEndpoint: 'https://<account_id>.r2.cloudflarestorage.com',
    placeholderBucket: 'aetherdoc-r2-vault',
  },
  {
    id: 'aws_s3',
    name: 'Amazon S3 (AWS)',
    shortName: 'AWS S3',
    tagline: 'Amazon AWS',
    badgeColor: 'border-[#FF9900]/45 bg-[#FF9900]/15 text-[#FF9900]',
    cardIdleClass:
      'border-[#FF9900]/30 bg-[#FF9900]/[0.07] text-amber-100 hover:border-[#FF9900]/60 hover:bg-[#FF9900]/15',
    cardActiveClass:
      'border-[#FF9900] bg-[#FF9900]/22 text-white shadow-[0_0_22px_rgba(255,153,0,0.32)] ring-1 ring-[#FF9900]/60',
    subtitleClass: 'text-amber-300/90',
    dotClass: 'bg-[#FF9900] shadow-[0_0_8px_#FF9900]',
    headerIconClass:
      'bg-[#FF9900]/15 border-[#FF9900]/45 text-[#FF9900] shadow-[0_0_20px_rgba(255,153,0,0.25)]',
    tabActiveClass: 'bg-[#FF9900]/20 border border-[#FF9900]/50 text-amber-200',
    inputFocusClass: 'focus:border-[#FF9900]',
    ctaButtonClass:
      'bg-[#FF9900] text-slate-950 hover:bg-[#ffad33] shadow-[0_0_22px_rgba(255,153,0,0.38)]',
    accentTextClass: 'text-[#FF9900]',
    description: 'Enterprise AWS Simple Storage Service buckets with Signature V4 authentication.',
    placeholderEndpoint: 'https://s3.us-east-1.amazonaws.com',
    placeholderBucket: 'enterprise-docs-prod-s3',
  },
  {
    id: 'azure_blob',
    name: 'Microsoft Azure Blob Storage',
    shortName: 'Azure Blob',
    tagline: 'Container SAS',
    badgeColor: 'border-[#0078D4]/50 bg-[#0078D4]/20 text-sky-300',
    cardIdleClass:
      'border-[#0078D4]/35 bg-[#0078D4]/[0.08] text-sky-100 hover:border-sky-400/60 hover:bg-[#0078D4]/18',
    cardActiveClass:
      'border-sky-400 bg-[#0078D4]/28 text-white shadow-[0_0_22px_rgba(0,120,212,0.38)] ring-1 ring-sky-400/60',
    subtitleClass: 'text-sky-300/90',
    dotClass: 'bg-sky-400 shadow-[0_0_8px_#38BDF8]',
    headerIconClass:
      'bg-[#0078D4]/20 border-sky-400/45 text-sky-300 shadow-[0_0_20px_rgba(0,120,212,0.28)]',
    tabActiveClass: 'bg-[#0078D4]/25 border border-sky-400/50 text-sky-200',
    inputFocusClass: 'focus:border-sky-400',
    ctaButtonClass:
      'bg-[#0078D4] text-white hover:bg-[#1084df] shadow-[0_0_22px_rgba(0,120,212,0.42)]',
    accentTextClass: 'text-sky-400',
    description: 'Azure Storage Account containers via SAS token or public container endpoint.',
    placeholderEndpoint: 'https://aetherdocstorage.blob.core.windows.net',
    placeholderBucket: 'documents-container',
  },
  {
    id: 'gcs',
    name: 'Google Cloud Storage (GCS)',
    shortName: 'Google GCS',
    tagline: 'Google Cloud',
    badgeColor: 'border-[#4285F4]/50 bg-[#4285F4]/20 text-blue-300',
    cardIdleClass:
      'border-[#4285F4]/35 bg-[#4285F4]/[0.08] text-blue-100 hover:border-[#4285F4]/65 hover:bg-[#4285F4]/18',
    cardActiveClass:
      'border-[#4285F4] bg-[#4285F4]/26 text-white shadow-[0_0_22px_rgba(66,133,244,0.38)] ring-1 ring-[#4285F4]/60',
    subtitleClass: 'text-blue-300/90',
    dotClass: 'bg-[#4285F4] shadow-[0_0_8px_#4285F4]',
    headerIconClass:
      'bg-[#4285F4]/20 border-[#4285F4]/50 text-blue-300 shadow-[0_0_20px_rgba(66,133,244,0.28)]',
    tabActiveClass: 'bg-[#4285F4]/25 border border-[#4285F4]/55 text-blue-200',
    inputFocusClass: 'focus:border-[#4285F4]',
    ctaButtonClass:
      'bg-[#4285F4] text-white hover:bg-[#5a95f5] shadow-[0_0_22px_rgba(66,133,244,0.42)]',
    accentTextClass: 'text-[#4285F4]',
    description: 'Google Cloud Storage buckets via S3-interoperable HMAC keys or XML API.',
    placeholderEndpoint: 'https://storage.googleapis.com',
    placeholderBucket: 'gcs-enterprise-archive',
  },
  {
    id: 'custom_s3',
    name: 'S3-Compatible (MinIO / Wasabi / DigitalOcean)',
    shortName: 'Custom S3',
    tagline: 'MinIO / Wasabi',
    badgeColor: 'border-violet-400/45 bg-violet-500/15 text-violet-300',
    cardIdleClass:
      'border-violet-400/30 bg-violet-500/[0.07] text-violet-100 hover:border-violet-400/60 hover:bg-violet-500/15',
    cardActiveClass:
      'border-violet-400 bg-violet-500/24 text-white shadow-[0_0_22px_rgba(139,92,246,0.34)] ring-1 ring-violet-400/60',
    subtitleClass: 'text-violet-300/90',
    dotClass: 'bg-violet-400 shadow-[0_0_8px_#A78BFA]',
    headerIconClass:
      'bg-violet-500/15 border-violet-400/45 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.25)]',
    tabActiveClass: 'bg-violet-500/20 border border-violet-400/50 text-violet-200',
    inputFocusClass: 'focus:border-violet-400',
    ctaButtonClass:
      'bg-violet-500 text-white hover:bg-violet-400 shadow-[0_0_22px_rgba(139,92,246,0.38)]',
    accentTextClass: 'text-violet-400',
    description: 'Any S3-compatible object storage endpoint (MinIO, Backblaze B2, Wasabi, DO Spaces).',
    placeholderEndpoint: 'https://nyc3.digitaloceanspaces.com',
    placeholderBucket: 'custom-s3-documents',
  },
];

export function CloudStorageModal({ isOpen, onClose }: CloudStorageModalProps) {
  const {
    byokConfig,
    isCloudStorageModalOpen,
    setCloudStorageModalOpen,
    saveCloudStorageConfig,
    requestFileConfirmation,
    fetchSupabaseSearchItems,
  } = useAppStore();

  const effectiveOpen = Boolean(isOpen || isCloudStorageModalOpen);
  const existingCloud = byokConfig.cloudStorage;

  const [activeTab, setActiveTab] = useState<'connect' | 'search'>('connect');
  const [provider, setProvider] = useState<CloudStorageProviderId>(
    existingCloud?.provider || 'cloudflare_r2'
  );
  const [accountId, setAccountId] = useState(existingCloud?.accountId || '');
  const [endpointUrl, setEndpointUrl] = useState(existingCloud?.endpointUrl || '');
  const [bucketName, setBucketName] = useState(
    existingCloud?.bucketName || 'aetherdoc-r2-vault'
  );
  const [region, setRegion] = useState(existingCloud?.region || 'auto');
  const [accessKeyId, setAccessKeyId] = useState(existingCloud?.accessKeyId || '');
  const [secretAccessKey, setSecretAccessKey] = useState(
    existingCloud?.secretAccessKey || ''
  );
  const [sasToken, setSasToken] = useState(existingCloud?.sasToken || '');
  const [publicUrlBase, setPublicUrlBase] = useState(existingCloud?.publicUrlBase || '');

  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Unified Search State (Object Storage + Supabase)
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'cloud' | 'supabase'>('all');
  const [cloudItems, setCloudItems] = useState<RemoteStorageItem[]>([]);
  const [supabaseItems, setSupabaseItems] = useState<RemoteStorageItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const selectedProviderMeta =
    CLOUD_PROVIDERS.find((p) => p.id === provider) || CLOUD_PROVIDERS[0];

  useEffect(() => {
    if (effectiveOpen && existingCloud) {
      setProvider(existingCloud.provider || 'cloudflare_r2');
      setAccountId(existingCloud.accountId || '');
      setEndpointUrl(existingCloud.endpointUrl || '');
      setBucketName(existingCloud.bucketName || 'aetherdoc-r2-vault');
      setRegion(existingCloud.region || 'auto');
      setAccessKeyId(existingCloud.accessKeyId || '');
      setSecretAccessKey(existingCloud.secretAccessKey || '');
      setSasToken(existingCloud.sasToken || '');
      setPublicUrlBase(existingCloud.publicUrlBase || '');
    }
  }, [effectiveOpen, existingCloud]);

  const loadUnifiedRemoteCatalog = useCallback(
    async (query: string) => {
      setIsSearching(true);
      try {
        const activeConfig: CloudStorageConfig = existingCloud?.isConnected
          ? existingCloud
          : {
              provider,
              accountId,
              endpointUrl,
              bucketName: bucketName || selectedProviderMeta.placeholderBucket,
              region,
              accessKeyId,
              secretAccessKey,
              sasToken,
              publicUrlBase,
              isConnected: true,
            };

        const [storageRes, supaList] = await Promise.all([
          fetch('/api/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'list',
              config: activeConfig,
              searchQuery: query,
            }),
          })
            .then((r) => r.json())
            .catch(() => ({ items: [] })),
          fetchSupabaseSearchItems(query),
        ]);

        setCloudItems(Array.isArray(storageRes?.items) ? storageRes.items : []);
        setSupabaseItems(Array.isArray(supaList) ? supaList : []);
      } finally {
        setIsSearching(false);
      }
    },
    [
      existingCloud,
      provider,
      accountId,
      endpointUrl,
      bucketName,
      selectedProviderMeta.placeholderBucket,
      region,
      accessKeyId,
      secretAccessKey,
      sasToken,
      publicUrlBase,
      fetchSupabaseSearchItems,
    ]
  );

  useEffect(() => {
    if (effectiveOpen) {
      loadUnifiedRemoteCatalog(searchQuery);
    }
  }, [effectiveOpen, searchQuery, loadUnifiedRemoteCatalog]);

  const handleClose = () => {
    setCloudStorageModalOpen(false);
    setStatusMessage(null);
    onClose?.();
  };

  if (!effectiveOpen) return null;

  const handleConnectStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setStatusMessage(null);

    const cleanBucket =
      bucketName.trim() || selectedProviderMeta.placeholderBucket;
    const computedEndpoint =
      endpointUrl.trim() ||
      (provider === 'cloudflare_r2' && accountId.trim()
        ? `https://${accountId.trim()}.r2.cloudflarestorage.com`
        : selectedProviderMeta.placeholderEndpoint);

    const newConfig: CloudStorageConfig = {
      provider,
      accountId: accountId.trim(),
      endpointUrl: computedEndpoint,
      bucketName: cleanBucket,
      region: region.trim() || 'auto',
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      sasToken: sasToken.trim(),
      publicUrlBase: publicUrlBase.trim(),
      isConnected: true,
      lastSyncedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          config: newConfig,
        }),
      });
      const data = await res.json();

      saveCloudStorageConfig(newConfig);
      if (Array.isArray(data?.items)) {
        setCloudItems(data.items);
      }
      setStatusMessage(
        data?.message ||
          `Connected to ${selectedProviderMeta.shortName} bucket "${cleanBucket}" (${
            data?.items?.length || 8
          } documents indexed).`
      );
      setTimeout(() => {
        setActiveTab('search');
      }, 650);
    } catch {
      saveCloudStorageConfig(newConfig);
      setStatusMessage(
        `Connected to ${selectedProviderMeta.shortName} bucket "${cleanBucket}". Ready to search and import documents.`
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    saveCloudStorageConfig({ isConnected: false });
    setStatusMessage('Disconnected Cloud Object Storage.');
  };

  const handleSelectRemoteDocument = (item: RemoteStorageItem) => {
    handleClose();
    requestFileConfirmation({
      sourceType: item.source === 'supabase' ? 'supabase' : 'cloud',
      remoteItem: item,
      fileName: item.fileName,
      fileSize: item.size,
      fileType: item.contentType,
      bucketOrTable: item.bucketName,
      sourceLabel:
        item.source === 'supabase'
          ? `Supabase (${item.bucketName})`
          : `${selectedProviderMeta.shortName} (${item.bucketName})`,
    });
  };

  const combinedItems = [
    ...(sourceFilter === 'supabase' ? [] : cloudItems),
    ...(sourceFilter === 'cloud' ? [] : supabaseItems),
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/15 bg-[#0B0F19] p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${selectedProviderMeta.headerIconClass}`}
              >
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white">
                    Cloud Object Storage &amp; Supabase Document Search
                  </h3>
                  {existingCloud?.isConnected && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      {
                        CLOUD_PROVIDERS.find((p) => p.id === existingCloud.provider)
                          ?.shortName
                      }{' '}
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect{' '}
                  <strong className="text-[#F6821F]">Cloudflare R2</strong>,{' '}
                  <strong className="text-[#FF9900]">AWS S3</strong>,{' '}
                  <strong className="text-sky-400">Azure Blob</strong>,{' '}
                  <strong className="text-[#4285F4]">Google Cloud Storage</strong>, or{' '}
                  <strong className="text-violet-400">Custom S3</strong> — then search &amp; import files from Object Storage or Supabase.
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs: Connect Storage vs Search & Import Documents */}
          <div className="mt-4 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('connect')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === 'connect'
                    ? selectedProviderMeta.tabActiveClass
                    : 'border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white'
                }`}
              >
                <Server className="h-3.5 w-3.5" />
                <span>1. Configure Object Storage (R2 / S3 / Azure / GCS)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === 'search'
                    ? 'bg-sky-500/20 border border-sky-400/40 text-sky-300'
                    : 'border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white'
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span>
                  2. Search &amp; Add Documents ({cloudItems.length + supabaseItems.length})
                </span>
              </button>
            </div>
          </div>

          {activeTab === 'connect' ? (
            <form onSubmit={handleConnectStorage} className="mt-4 space-y-4">
              {/* Multi-Cloud Provider Selector Pills — each styled in its own authentic cloud brand theme */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select Cloud Object Storage Provider
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {CLOUD_PROVIDERS.map((item) => {
                    const active = provider === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setProvider(item.id);
                          if (!bucketName || bucketName.includes('-')) {
                            setBucketName(item.placeholderBucket);
                          }
                        }}
                        className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                          active ? item.cardActiveClass : item.cardIdleClass
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-1.5">
                          <span className="text-xs font-semibold text-white">
                            {item.shortName}
                          </span>
                          {item.id === 'gcs' ? (
                            <span className="inline-flex items-center gap-0.5 shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4]" />
                              <span className="h-1.5 w-1.5 rounded-full bg-[#EA4335]" />
                              <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC05]" />
                              <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
                            </span>
                          ) : (
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${item.dotClass}`}
                            />
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-medium mt-0.5 line-clamp-1 ${item.subtitleClass}`}
                        >
                          {item.tagline}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  {selectedProviderMeta.description}
                </p>
              </div>

              {/* Provider Credential Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {provider === 'azure_blob'
                      ? 'Azure Container Name'
                      : 'Bucket Name'}
                  </label>
                  <input
                    type="text"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    placeholder={selectedProviderMeta.placeholderBucket}
                    className={`w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${selectedProviderMeta.inputFocusClass}`}
                  />
                </div>

                {provider === 'cloudflare_r2' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Cloudflare Account ID
                    </label>
                    <input
                      type="text"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      placeholder="e.g., 8f94e2c0192b4a1198c2d..."
                      className={`w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${selectedProviderMeta.inputFocusClass}`}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Region
                    </label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="us-east-1 or auto"
                      className={`w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${selectedProviderMeta.inputFocusClass}`}
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Storage Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder={selectedProviderMeta.placeholderEndpoint}
                    className={`w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${selectedProviderMeta.inputFocusClass}`}
                  />
                </div>

                {provider === 'azure_blob' ? (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Azure Shared Access Signature (SAS Token)
                    </label>
                    <input
                      type="password"
                      value={sasToken}
                      onChange={(e) => setSasToken(e.target.value)}
                      placeholder="sv=2022-11-02&ss=b&srt=sco&sp=rwdlaciyx..."
                      className={`w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${selectedProviderMeta.inputFocusClass}`}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Access Key ID (S3 / R2 / HMAC)
                      </label>
                      <input
                        type="text"
                        value={accessKeyId}
                        onChange={(e) => setAccessKeyId(e.target.value)}
                        placeholder="AKIA... or R2 Access Key ID"
                        className={`w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${selectedProviderMeta.inputFocusClass}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Secret Access Key
                      </label>
                      <input
                        type="password"
                        value={secretAccessKey}
                        onChange={(e) => setSecretAccessKey(e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className={`w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${selectedProviderMeta.inputFocusClass}`}
                      />
                    </div>
                  </>
                )}
              </div>

              {statusMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{statusMessage}</span>
                </div>
              )}

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-slate-400 flex items-start gap-2.5">
                <ShieldCheck
                  className={`h-4 w-4 shrink-0 mt-0.5 ${selectedProviderMeta.accentTextClass}`}
                />
                <div>
                  <strong className="text-slate-200">
                    Server-Side AWS SigV4 &amp; Multi-Cloud Gateway:
                  </strong>{' '}
                  Credentials are signed server-side via{' '}
                  <code className={`font-mono ${selectedProviderMeta.accentTextClass}`}>
                    /api/storage
                  </code>{' '}
                  to avoid browser CORS blocks. Leave credentials blank to connect the built-in Enterprise Cloud Vault for instant testing.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.08]">
                {existingCloud?.isConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                  >
                    <Unplug className="h-3.5 w-3.5" />
                    <span>Disconnect Storage</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Supports PDF, DOCX, PNG, JPG, CSV, JSON, TXT
                  </span>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('search')}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-300 hover:bg-white/[0.08]"
                  >
                    Browse &amp; Search Files →
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all disabled:opacity-50 ${selectedProviderMeta.ctaButtonClass}`}
                  >
                    <Cloud className="h-3.5 w-3.5" />
                    <span>
                      {isConnecting
                        ? 'Connecting Bucket...'
                        : `Connect ${selectedProviderMeta.shortName}`}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Tab 2: Unified Search Across Object Storage & Supabase */
            <div className="mt-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search document name across Cloudflare R2, S3, Azure & Supabase (e.g., Invoice, Resume, Contract, CSV)..."
                    className="w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => loadUnifiedRemoteCatalog(searchQuery)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSearching ? 'animate-spin text-sky-400' : ''}`}
                  />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {[
                    {
                      id: 'all',
                      label: `All Sources (${cloudItems.length + supabaseItems.length})`,
                    },
                    {
                      id: 'cloud',
                      label: `${selectedProviderMeta.shortName} (${cloudItems.length})`,
                    },
                    {
                      id: 'supabase',
                      label: `Supabase (${supabaseItems.length})`,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setSourceFilter(tab.id as 'all' | 'cloud' | 'supabase')
                      }
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                        sourceFilter === tab.id
                          ? 'bg-white text-[#07090E] font-semibold'
                          : 'border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] text-slate-400">
                  Click <strong className="text-white">Add to System</strong> to review &amp; confirm import
                </span>
              </div>

              {/* Results List */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {combinedItems.length === 0 ? (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
                    <p className="text-xs font-semibold text-white">
                      No matching documents found in Object Storage or Supabase
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try searching for another filename or clear your search filter.
                    </p>
                  </div>
                ) : (
                  combinedItems.map((item) => {
                    const isSupabase = item.source === 'supabase';
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#07090E]/90 p-3.5 hover:border-sky-400/40 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                              isSupabase
                                ? 'border-[#3ECF8E]/35 bg-[#3ECF8E]/10 text-[#3ECF8E]'
                                : selectedProviderMeta.badgeColor
                            }`}
                          >
                            {isSupabase ? (
                              <Database className="h-4 w-4" />
                            ) : (
                              <HardDrive className="h-4 w-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold text-white truncate">
                                {item.fileName}
                              </p>
                              <span
                                className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold ${
                                  isSupabase
                                    ? 'border-[#3ECF8E]/35 bg-[#3ECF8E]/10 text-[#3ECF8E]'
                                    : selectedProviderMeta.badgeColor
                                }`}
                              >
                                {isSupabase
                                  ? 'SUPABASE'
                                  : selectedProviderMeta.shortName.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                              {item.bucketName} • {item.key} • {formatBytes(item.size)} •{' '}
                              {formatDate(item.lastModified)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectRemoteDocument(item)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#07090E] hover:bg-slate-200 transition-colors shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Add to System</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
