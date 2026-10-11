'use client';

import React, { useState, useEffect } from 'react';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { GlobalHeader } from '@/components/layout/GlobalHeader';
import { CommandBar } from '@/components/common/CommandBar';
import { ByokModal } from '@/components/common/ByokModal';
import { SupabaseSyncModal } from '@/components/common/SupabaseSyncModal';
import { CloudStorageModal } from '@/components/common/CloudStorageModal';
import { DocumentConfirmModal } from '@/components/common/DocumentConfirmModal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isByokOpen, setIsByokOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isCloudStorageOpen, setIsCloudStorageOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative min-h-screen bg-transparent text-slate-100 overflow-x-hidden font-sans">
      {/* Main app surface */}
      <div className="relative z-10 flex min-h-screen">
        <SidebarNav
          onOpenByok={() => setIsByokOpen(true)}
          onOpenSupabase={() => setIsSupabaseOpen(true)}
          onOpenCloudStorage={() => setIsCloudStorageOpen(true)}
        />

        <div className="flex-1 md:pl-64 flex flex-col min-h-screen min-w-0 max-w-full overflow-x-hidden">
          <GlobalHeader
            onOpenCommand={() => setIsCommandOpen(true)}
            onOpenByok={() => setIsByokOpen(true)}
            onOpenSupabase={() => setIsSupabaseOpen(true)}
            onOpenCloudStorage={() => setIsCloudStorageOpen(true)}
          />
          <main className="flex-1 p-4 md:p-5 min-w-0 max-w-full overflow-x-hidden">{children}</main>
        </div>
      </div>

      <ByokModal isOpen={isByokOpen} onClose={() => setIsByokOpen(false)} />
      <SupabaseSyncModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />
      <CloudStorageModal
        isOpen={isCloudStorageOpen}
        onClose={() => setIsCloudStorageOpen(false)}
      />
      <DocumentConfirmModal />
      <CommandBar isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </div>
  );
}
