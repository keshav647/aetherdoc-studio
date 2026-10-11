'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { ExtractedField } from '@/lib/extraction/types';
import { reExtractExistingDocumentWithAi } from '@/lib/extraction/universalExtractor';
import { StudioHeader } from '@/components/studio/StudioHeader';
import { PdfCanvasViewer } from '@/components/studio/PdfCanvasViewer';
import { FieldLedger } from '@/components/studio/FieldLedger';
import { AuditDrawer } from '@/components/studio/AuditDrawer';
import { HotkeyGuideModal } from '@/components/studio/HotkeyGuideModal';

export default function DocumentStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const documentId = resolvedParams.id;

  const {
    documents,
    allDocuments,
    fieldsByDoc,
    logsByDoc,
    thresholds,
    byokConfig,
    updateField,
    addField,
    deleteField,
    batchVerifyDocument,
    replaceDocumentExtraction,
  } = useAppStore();

  const document =
    documents.find((d) => d.id === documentId) ||
    allDocuments.find((d) => d.id === documentId) ||
    documents.find((d) => !d.isDemo) ||
    allDocuments.find((d) => !d.isDemo) ||
    documents[0] ||
    allDocuments[0];

  const resolvedDocId = document?.id || documentId;
  const fields = fieldsByDoc[resolvedDocId] || [];
  const auditLogs = logsByDoc[resolvedDocId] || [];

  const [activeFieldId, setActiveFieldId] = useState<string | null>(
    searchParams.get('field') || (fields[0]?.id ?? null)
  );
  const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [selectedAuditField, setSelectedAuditField] = useState<ExtractedField | null>(null);
  const [isHotkeyGuideOpen, setIsHotkeyGuideOpen] = useState(false);
  const autoUpgradedDocsRef = useRef<Record<string, boolean>>({});

  // Only run local fallback extraction if a document somehow has 0 extracted fields
  useEffect(() => {
    if (!document || document.isDemo) return;
    if (fields.length > 0) return;

    const upgradeKey = `${document.id}-empty-recovery`;
    if (autoUpgradedDocsRef.current[upgradeKey]) return;

    if (document.raw_text || document.file_url?.startsWith('data:')) {
      autoUpgradedDocsRef.current[upgradeKey] = true;
      reExtractExistingDocumentWithAi(document, fields, byokConfig, true).then((res) => {
        if (res && res.fields.length > 0) {
          const allVerified = res.fields.every((f) => f.status === 'verified');
          replaceDocumentExtraction(
            document.id,
            res.fields,
            {
              document_type: res.documentType,
              vendor_name: res.vendorName,
              page_count: res.pageCount,
              status: allVerified ? 'verified' : 'review_required',
            },
            res.engineLabel
          );
        }
      });
    }
  }, [document, fields, byokConfig, replaceDocumentExtraction]);

  // Sync activeFieldId when query parameter or document changes
  useEffect(() => {
    const queryField = searchParams.get('field');
    if (queryField && fields.some((f) => f.id === queryField)) {
      setActiveFieldId(queryField);
    } else if (fields.length > 0 && !fields.some((f) => f.id === activeFieldId)) {
      setActiveFieldId(fields[0].id);
      setCurrentPage(1);
    }
  }, [resolvedDocId, searchParams, fields, activeFieldId]);

  // Studio Keyboard Ergonomics Engine (J/K, A, F, Delete/Backspace, [/], H, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsHotkeyGuideOpen((prev) => !prev);
        return;
      }

      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsAuditDrawerOpen((prev) => !prev);
        return;
      }

      if (e.key === '[' && document) {
        e.preventDefault();
        const prevPage = Math.max(1, currentPage - 1);
        setCurrentPage(prevPage);
        const firstOnPage = fields.find((f) => f.page_number === prevPage);
        if (firstOnPage) setActiveFieldId(firstOnPage.id);
        return;
      }

      if (e.key === ']' && document) {
        e.preventDefault();
        const nextPage = Math.min(document.page_count, currentPage + 1);
        setCurrentPage(nextPage);
        const firstOnPage = fields.find((f) => f.page_number === nextPage);
        if (firstOnPage) setActiveFieldId(firstOnPage.id);
        return;
      }

      if (fields.length === 0) return;
      const currentIndex = fields.findIndex((f) => f.id === activeFieldId);

      if ((e.key === 'Delete' || e.key === 'Backspace') && activeFieldId) {
        e.preventDefault();
        const remaining = fields.filter((f) => f.id !== activeFieldId);
        const nextActive =
          remaining[Math.min(currentIndex, remaining.length - 1)]?.id ?? null;
        deleteField(resolvedDocId, activeFieldId);
        setActiveFieldId(nextActive);
        return;
      }

      if (e.key.toLowerCase() === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = currentIndex < fields.length - 1 ? currentIndex + 1 : 0;
        setActiveFieldId(fields[nextIdx].id);
      } else if (e.key.toLowerCase() === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = currentIndex > 0 ? currentIndex - 1 : fields.length - 1;
        setActiveFieldId(fields[prevIdx].id);
      } else if (e.key.toLowerCase() === 'a' && activeFieldId) {
        e.preventDefault();
        const currentField = fields.find((f) => f.id === activeFieldId);
        if (currentField) {
          updateField(resolvedDocId, currentField.id, currentField.field_value, 'CONFIRM');
          if (thresholds.autoAdvanceOnVerify && currentIndex < fields.length - 1) {
            setActiveFieldId(fields[currentIndex + 1].id);
          }
        }
      } else if (e.key.toLowerCase() === 'f' && activeFieldId) {
        e.preventDefault();
        const currentField = fields.find((f) => f.id === activeFieldId);
        if (currentField) {
          updateField(resolvedDocId, currentField.id, currentField.field_value, 'FLAG');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    fields,
    activeFieldId,
    currentPage,
    document,
    resolvedDocId,
    updateField,
    deleteField,
    thresholds.autoAdvanceOnVerify,
  ]);

  if (!document) {
    return null;
  }

  const handleUpdateFieldValue = (
    fieldId: string,
    newValue: string,
    action: 'OVERRIDE' | 'CONFIRM' | 'FLAG'
  ) => {
    updateField(resolvedDocId, fieldId, newValue, action);
  };

  const handleDeleteField = (fieldId: string) => {
    const idx = fields.findIndex((f) => f.id === fieldId);
    const remaining = fields.filter((f) => f.id !== fieldId);
    deleteField(resolvedDocId, fieldId);
    if (activeFieldId === fieldId) {
      const nextActive = remaining[Math.min(Math.max(0, idx), remaining.length - 1)]?.id ?? null;
      setActiveFieldId(nextActive);
    }
    if (hoveredFieldId === fieldId) {
      setHoveredFieldId(null);
    }
  };

  const handleBatchVerify = () => {
    batchVerifyDocument(resolvedDocId);
  };

  const handleOpenAuditHistory = (field: ExtractedField) => {
    setSelectedAuditField(field);
    setIsAuditDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.75rem)] w-full min-w-0 max-w-full space-y-3 mx-auto overflow-hidden">
      {/* Modular Studio Header Bar */}
      <StudioHeader
        document={document}
        allDocuments={allDocuments}
        fields={fields}
        auditLogs={auditLogs}
        onOpenAuditDrawer={() => {
          setSelectedAuditField(null);
          setIsAuditDrawerOpen(true);
        }}
        onOpenHotkeyGuide={() => setIsHotkeyGuideOpen(true)}
      />

      {/* Dual-Pane HITL Stage Centerpiece */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 min-w-0 w-full overflow-hidden">
        <div className="lg:col-span-7 h-full min-h-0 min-w-0 overflow-hidden">
          <PdfCanvasViewer
            document={document}
            fields={fields}
            activeFieldId={activeFieldId}
            hoveredFieldId={hoveredFieldId}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onSelectField={setActiveFieldId}
            onHoverField={setHoveredFieldId}
            onAddField={(newField) => {
              const created = addField(resolvedDocId, newField);
              setActiveFieldId(created.id);
            }}
            onDeleteField={handleDeleteField}
          />
        </div>

        <div className="lg:col-span-5 h-full min-h-0 min-w-0 overflow-hidden">
          <FieldLedger
            fields={fields}
            documentType={document.document_type}
            currentPage={currentPage}
            activeFieldId={activeFieldId}
            hoveredFieldId={hoveredFieldId}
            onSelectField={setActiveFieldId}
            onHoverField={setHoveredFieldId}
            onUpdateField={handleUpdateFieldValue}
            onDeleteField={handleDeleteField}
            onBatchVerify={handleBatchVerify}
            onOpenAuditHistory={handleOpenAuditHistory}
          />
        </div>
      </div>

      {/* Slide-out Immutable Audit History Drawer */}
      <AuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        field={selectedAuditField}
        logs={auditLogs}
      />

      {/* Keyboard Shortcuts Guide Modal */}
      <HotkeyGuideModal
        isOpen={isHotkeyGuideOpen}
        onClose={() => setIsHotkeyGuideOpen(false)}
      />
    </div>
  );
}
