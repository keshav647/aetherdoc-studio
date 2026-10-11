'use client';

import React from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProductShowcase } from '@/components/landing/ProductShowcase';
import { ArchitectureBento } from '@/components/landing/ArchitectureBento';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { ByokModal } from '@/components/common/ByokModal';
import { CloudStorageModal } from '@/components/common/CloudStorageModal';
import { DocumentConfirmModal } from '@/components/common/DocumentConfirmModal';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-sans selection:bg-sky-500/20 selection:text-sky-200 overflow-x-hidden">
      <LandingHeader />
      <HeroSection />
      <div id="showcase">
        <ProductShowcase />
      </div>
      <ArchitectureBento />
      <LandingFooter />
      <ByokModal isOpen={false} onClose={() => {}} />
      <CloudStorageModal isOpen={false} onClose={() => {}} />
      <DocumentConfirmModal />
    </div>
  );
}
