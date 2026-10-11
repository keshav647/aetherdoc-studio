'use client';

import { useSyncExternalStore, useEffect } from 'react';
import {
  MOCK_DOCUMENTS,
  MOCK_FIELDS,
  MOCK_AUDIT_LOGS,
  MOCK_CHUNKS,
  MOCK_TENANTS,
  MOCK_USER,
} from '@/lib/supabase/mock-data';
import {
  DocumentRecord,
  DocumentType,
  ExtractedField,
  NormalizedBBox,
  AuditLog,
  DocumentChunk,
  TelemetryKPIs,
  ByokConfig,
  CloudStorageConfig,
  RemoteStorageItem,
  PendingFileConfirmation,
  Tenant,
  UserProfile,
} from '@/lib/extraction/types';
import {
  extractFieldsLocallyFromText,
  inferDocumentType,
  detectAiProviderFromKey,
  sanitizeAndExtractApiKey,
  recalibrateDocumentFieldsLayout,
} from '@/lib/extraction/universalExtractor';
import { cleanPdfMetadataNoise } from '@/lib/extraction/localFileParsers';

export interface ThresholdSettings {
  highConfidence: number; // e.g. 0.90
  anomalyThreshold: number; // e.g. 0.70
  autoAdvanceOnVerify: boolean;
}

export interface AppState {
  documents: DocumentRecord[];
  fieldsByDoc: Record<string, ExtractedField[]>;
  logsByDoc: Record<string, AuditLog[]>;
  chunks: DocumentChunk[];
  tenants: Tenant[];
  activeTenantId: string;
  user: UserProfile;
  thresholds: ThresholdSettings;
  byokConfig: ByokConfig;
  hideDemoSamples: boolean;
  byokPromptFileName: string | null;
  isCloudStorageModalOpen: boolean;
  pendingFileConfirmation: PendingFileConfirmation | null;
}

export interface MemoryUsageStats {
  bytesUsed: number;
  formattedSize: string;
  uploadedDocsCount: number;
  demoDocsCount: number;
  totalDocsCount: number;
  totalFieldsCount: number;
  uploadedFieldsCount: number;
  totalChunksCount: number;
}

const STORAGE_KEY_STATE = 'aetherdoc_enterprise_state_v6';
const LEGACY_STORAGE_KEYS = [
  'aetherdoc_enterprise_state_v1',
  'aetherdoc_enterprise_state_v2',
  'aetherdoc_enterprise_state_v3',
  'aetherdoc_enterprise_state_v4',
  'aetherdoc_enterprise_state_v5',
];

const DEFAULT_THRESHOLDS: ThresholdSettings = {
  highConfidence: 0.9,
  anomalyThreshold: 0.7,
  autoAdvanceOnVerify: true,
};

export const DEFAULT_CLOUD_STORAGE: CloudStorageConfig = {
  provider: 'cloudflare_r2',
  endpointUrl: '',
  bucketName: 'aetherdoc-enterprise-vault',
  accessKeyId: '',
  secretAccessKey: '',
  region: 'auto',
  accountId: '',
  sasOrPublicUrl: '',
  isConnected: false,
};

const DEFAULT_BYOK: ByokConfig = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  geminiApiKey: '',
  openaiApiKey: '',
  llmProvider: 'gemini',
  llmApiKey: '',
  preferredExtractionMode: 'ai',
  detectedProviderName: '',
  isLiveConnected: false,
  isSupabaseConnected: false,
  sandboxMode: false,
  cloudStorage: DEFAULT_CLOUD_STORAGE,
};

function createDefaultState(): AppState {
  return {
    documents: MOCK_DOCUMENTS,
    fieldsByDoc: MOCK_FIELDS,
    logsByDoc: MOCK_AUDIT_LOGS,
    chunks: MOCK_CHUNKS,
    tenants: MOCK_TENANTS,
    activeTenantId: MOCK_TENANTS[0].id, // 'all'
    user: MOCK_USER,
    thresholds: DEFAULT_THRESHOLDS,
    byokConfig: DEFAULT_BYOK,
    hideDemoSamples: false,
    byokPromptFileName: null,
    isCloudStorageModalOpen: false,
    pendingFileConfirmation: null,
  };
}

class AppStoreManager {
  private state: AppState = createDefaultState();
  private listeners: Set<() => void> = new Set();
  private hydrated = false;

  /**
   * Called inside useEffect after React finishes initial client hydration so
   * SSR HTML and initial client render match 100% with zero hydration mismatch.
   */
  public ensureHydrated = () => {
    if (this.hydrated || typeof window === 'undefined') return;
    this.hydrated = true;
    try {
      // Automatically purge all legacy v1..v5 state keys & stale session cache
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        window.localStorage.removeItem(legacyKey);
      }
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (
          key &&
          key !== STORAGE_KEY_STATE &&
          (key.startsWith('aetherdoc_') || key.startsWith('doculens_'))
        ) {
          window.localStorage.removeItem(key);
        }
      }

      const raw = window.localStorage.getItem(STORAGE_KEY_STATE);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        const mergedFields: Record<string, ExtractedField[]> = {
          ...(parsed.fieldsByDoc || {}),
        };

        const isSyntheticOrMetadataField = (f: ExtractedField): boolean => {
          const k = (f.field_key || '').toLowerCase();
          const l = (f.label || '').toLowerCase();
          const v = f.field_value || '';
          if (
            k === 'source_file_name' ||
            k === 'payload_size' ||
            k === 'file_size_info' ||
            k === 'uploaded_file_name' ||
            l === 'uploaded file name' ||
            l === 'file size & type' ||
            l === 'file size & format' ||
            l === 'document date' ||
            l === 'detected vendor / title'
          ) {
            return true;
          }
          if (
            /Academic Degree & Professional Certifications —|Core Professional Experience & Role History —|Analytical Problem Solving, Operations Management, Documentation|Verified Candidate Resume|Ready for Verification in Studio|Pending Human Verification in Studio|Chromium|Skia\/PDF|puzzlergames/i.test(
              v
            )
          ) {
            return true;
          }
          return false;
        };

        const sanitizedDocs: DocumentRecord[] = [];

        for (const doc of parsed.documents || MOCK_DOCUMENTS) {
          if (doc.isDemo) {
            if (!mergedFields[doc.id] && MOCK_FIELDS[doc.id]) {
              mergedFields[doc.id] = MOCK_FIELDS[doc.id];
            }
            sanitizedDocs.push(doc);
            continue;
          }

          const cleanedVendor = cleanPdfMetadataNoise(
            doc.vendor_name || doc.file_name.replace(/\.[^.]+$/, '')
          );
          const inferredType =
            doc.document_type || inferDocumentType(doc.file_name, doc.raw_text || '');
          const realFields = (mergedFields[doc.id] || []).filter(
            (f) => !isSyntheticOrMetadataField(f)
          );

          const isAiExtracted =
            Boolean(
              doc.extraction_engine &&
                !/^Local/i.test(doc.extraction_engine)
            ) || realFields.some((f) => f.id.includes('-ai-'));

          const hasMergedProjectInEdu = realFields.some(
            (f) =>
              f.field_key === 'education_and_degree' &&
              /AES-256|Engineered an offline/i.test(f.field_value)
          );

          const hasLegacyCategories =
            realFields.length > 0 &&
            realFields.every((f) =>
              ['DOCUMENT_META', 'LINE_ITEMS', 'FINANCIAL_TOTALS', 'COMPLIANCE'].includes(
                f.category
              )
            );

          const pageBreakCount = (doc.raw_text || '')
            .split(/\n?---\s*\[PAGE_BREAK\]\s*---\n?/)
            .filter((p) => p.trim().length > 0).length;

          const currentMaxPage = realFields.reduce(
            (m, f) => Math.max(m, f.page_number || 1),
            1
          );

          if (
            !isAiExtracted &&
            doc.raw_text &&
            doc.raw_text.trim().length > 20 &&
            (hasMergedProjectInEdu ||
              realFields.length === 0 ||
              hasLegacyCategories ||
              pageBreakCount > currentMaxPage)
          ) {
            const reParsed = extractFieldsLocallyFromText(
              doc.raw_text,
              doc.file_name,
              doc.id,
              doc.tenant_id,
              inferredType,
              Math.max(1, pageBreakCount)
            );
            const normalizedFields = reParsed.fields.map((f) => ({
              ...f,
              status:
                f.status === 'raw' && f.confidence >= 0.88 ? ('verified' as const) : f.status,
            }));
            const maxPage = Math.max(
              1,
              normalizedFields.reduce((m, f) => Math.max(m, f.page_number || 1), 1)
            );
            const allVerified =
              normalizedFields.length > 0 &&
              normalizedFields.every((f) => f.status === 'verified');
            mergedFields[doc.id] = normalizedFields;
            sanitizedDocs.push({
              ...doc,
              vendor_name: reParsed.detectedVendor || cleanedVendor,
              document_type: inferredType,
              page_count: maxPage,
              status: allVerified ? 'verified' : doc.status,
            });
          } else if (realFields.length >= 1) {
            let combinedFields = [...realFields];
            if (doc.raw_text && pageBreakCount > currentMaxPage) {
              const supplemental = extractFieldsLocallyFromText(
                doc.raw_text,
                doc.file_name,
                doc.id,
                doc.tenant_id,
                inferredType,
                pageBreakCount
              );
              const existingPages = new Set(combinedFields.map((f) => f.page_number || 1));
              const missingPageFields = supplemental.fields.filter(
                (f) => !existingPages.has(f.page_number || 1)
              );
              if (missingPageFields.length > 0) {
                combinedFields = [...combinedFields, ...missingPageFields];
              }
            }

            const recalibrated = recalibrateDocumentFieldsLayout(combinedFields);
            const normalizedFields = recalibrated.map((f) => ({
              ...f,
              status:
                f.status === 'raw' && f.confidence >= 0.88 ? ('verified' as const) : f.status,
            }));
            const maxPage = Math.max(
              1,
              normalizedFields.reduce((m, f) => Math.max(m, f.page_number || 1), 1)
            );
            const allVerified =
              normalizedFields.length > 0 &&
              normalizedFields.every((f) => f.status === 'verified');
            mergedFields[doc.id] = normalizedFields;
            sanitizedDocs.push({
              ...doc,
              vendor_name: cleanedVendor,
              document_type: inferredType,
              page_count: maxPage,
              status: allVerified ? 'verified' : doc.status,
            });
          } else {
            const fallbackParsed = extractFieldsLocallyFromText(
              doc.raw_text || doc.file_name,
              doc.file_name,
              doc.id,
              doc.tenant_id,
              inferredType
            );
            const fallbackMaxPage = Math.max(
              1,
              fallbackParsed.fields.reduce((m, f) => Math.max(m, f.page_number || 1), 1)
            );
            mergedFields[doc.id] = fallbackParsed.fields;
            sanitizedDocs.push({
              ...doc,
              vendor_name: cleanedVendor,
              document_type: inferredType,
              page_count: fallbackMaxPage,
              status: 'verified',
            });
          }
        }

        const mergedLogs = { ...MOCK_AUDIT_LOGS, ...(parsed.logsByDoc || {}) };
        const rawByok: ByokConfig = {
          ...DEFAULT_BYOK,
          ...(parsed.byokConfig || {}),
        };
        const rawKeyCandidate =
          rawByok.llmApiKey || rawByok.geminiApiKey || rawByok.openaiApiKey || '';
        const sanitizedKey = sanitizeAndExtractApiKey(rawKeyCandidate);
        const detectedProvider = detectAiProviderFromKey(sanitizedKey);

        const mergedByok: ByokConfig = {
          ...rawByok,
          geminiApiKey: detectedProvider.id === 'gemini' ? sanitizedKey : '',
          openaiApiKey:
            detectedProvider.id !== 'gemini' && detectedProvider.id !== 'local' ? sanitizedKey : '',
          llmProvider: detectedProvider.id === 'gemini' ? 'gemini' : 'openai',
          llmApiKey: sanitizedKey,
          detectedProviderName: sanitizedKey ? detectedProvider.shortLabel : '',
          preferredExtractionMode: sanitizedKey
            ? rawByok.preferredExtractionMode || 'ai'
            : 'local',
          isLiveConnected: Boolean(sanitizedKey || rawByok.supabaseUrl),
          cloudStorage: {
            ...DEFAULT_CLOUD_STORAGE,
            ...(rawByok.cloudStorage || {}),
          },
        };

        this.state = {
          ...this.state,
          ...parsed,
          documents: sanitizedDocs,
          tenants: MOCK_TENANTS,
          fieldsByDoc: mergedFields,
          logsByDoc: mergedLogs,
          thresholds: { ...DEFAULT_THRESHOLDS, ...(parsed.thresholds || {}) },
          byokConfig: mergedByok,
          hideDemoSamples: parsed.hideDemoSamples ?? false,
          byokPromptFileName: null,
          isCloudStorageModalOpen: false,
          pendingFileConfirmation: null,
        };
        this.persist();
        this.listeners.forEach((l) => l());
      }
    } catch {
      // Ignore corrupt localStorage
    }
  };

  private persist() {
    if (typeof window === 'undefined') return;
    const compactDocuments = this.state.documents.map((doc) => ({
      ...doc,
      file_url:
        doc.file_url && doc.file_url.startsWith('data:') && doc.file_url.length > 64000
          ? `/uploaded/${encodeURIComponent(doc.file_name)}`
          : doc.file_url,
      raw_text: doc.raw_text ? doc.raw_text.slice(0, 35000) : doc.raw_text,
    }));

    const serializableState = {
      ...this.state,
      documents: compactDocuments,
      byokPromptFileName: null,
      isCloudStorageModalOpen: false,
      pendingFileConfirmation: null,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(serializableState));
    } catch {
      try {
        const ultraCompactState = {
          ...serializableState,
          documents: compactDocuments.map((doc, idx) => ({
            ...doc,
            file_url: doc.file_url?.startsWith('data:')
              ? `/uploaded/${encodeURIComponent(doc.file_name)}`
              : doc.file_url,
            raw_text: idx < 5 ? doc.raw_text?.slice(0, 12000) : undefined,
          })),
        };
        window.localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(ultraCompactState));
      } catch {
        // Ignore only if browser storage is completely disabled
      }
    }
    window.dispatchEvent(new Event('doculens_docs_updated'));
    window.dispatchEvent(new Event('doculens_field_updated'));
    window.dispatchEvent(new Event('doculens_byok_updated'));
  }

  public getState = (): AppState => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setState(updater: (prev: AppState) => AppState) {
    this.state = updater(this.state);
    this.persist();
    this.listeners.forEach((l) => l());
  }

  public getFilteredDocuments(sourceState: AppState = this.state): DocumentRecord[] {
    let list = sourceState.documents;
    if (sourceState.activeTenantId !== 'all') {
      list = list.filter((d) => d.tenant_id === sourceState.activeTenantId);
    }
    if (sourceState.hideDemoSamples) {
      list = list.filter((d) => !d.isDemo);
    }
    return list;
  }

  public getTelemetry(sourceState: AppState = this.state): TelemetryKPIs {
    const docs = this.getFilteredDocuments(sourceState);
    const totalDocuments = docs.length;
    const reconciledCount = docs.filter((d) => d.status === 'verified').length;
    const pendingReviewCount = docs.filter((d) => d.status !== 'verified').length;

    const docIds = new Set(docs.map((d) => d.id));
    const allFields = Object.entries(sourceState.fieldsByDoc)
      .filter(([docId]) => docIds.has(docId))
      .flatMap(([, list]) => list);

    const flaggedCount = allFields.filter(
      (f) => f.status === 'flagged' || f.confidence < sourceState.thresholds.anomalyThreshold
    ).length;

    const avgAccuracy =
      totalDocuments > 0
        ? Number((docs.reduce((acc, d) => acc + d.accuracy_rate, 0) / totalDocuments).toFixed(1))
        : 100.0;

    const anomalyRate =
      allFields.length > 0
        ? Number(((flaggedCount / allFields.length) * 100).toFixed(1))
        : 0;

    const unverifiedFieldsCount = allFields.filter((f) => f.status !== 'verified').length;
    const dynamicReviewSeconds =
      unverifiedFieldsCount > 0 ? Number((8.0 + unverifiedFieldsCount * 1.8).toFixed(1)) : 0;

    return {
      globalAccuracy: avgAccuracy,
      averageReviewTimeSeconds: dynamicReviewSeconds,
      anomalyRate,
      totalDocuments,
      pendingReviewCount,
      reconciledCount,
      throughputPerDay: 120 + totalDocuments * 6,
    };
  }

  public updateField = (
    documentId: string,
    fieldId: string,
    newValue: string,
    action: 'OVERRIDE' | 'CONFIRM' | 'FLAG'
  ) => {
    this.setState((prev) => {
      const currentFields = [...(prev.fieldsByDoc[documentId] || [])];
      const idx = currentFields.findIndex((f) => f.id === fieldId);
      if (idx === -1) return prev;

      const target = currentFields[idx];
      const updatedField: ExtractedField = {
        ...target,
        field_value: newValue,
        confidence: action === 'FLAG' ? Math.min(target.confidence, 0.65) : 1.0,
        status: action === 'FLAG' ? 'flagged' : 'verified',
        audited_by: prev.user.full_name,
        updated_at: new Date().toISOString(),
      };
      currentFields[idx] = updatedField;

      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        document_id: documentId,
        tenant_id: target.tenant_id,
        user_id: prev.user.id,
        user_name: prev.user.full_name,
        field_key: target.field_key,
        field_label: target.label,
        old_value: target.field_value,
        new_value: newValue,
        action,
        timestamp: new Date().toISOString(),
      };

      const allVerified = currentFields.every((f) => f.status === 'verified');
      const verifiedRatio =
        currentFields.filter((f) => f.status === 'verified').length /
        Math.max(currentFields.length, 1);

      const updatedDocs = prev.documents.map((doc) => {
        if (doc.id !== documentId) return doc;
        return {
          ...doc,
          status: allVerified ? ('verified' as const) : ('review_required' as const),
          accuracy_rate: allVerified
            ? 99.8
            : Number((82 + verifiedRatio * 17.5).toFixed(1)),
          updated_at: new Date().toISOString(),
        };
      });

      return {
        ...prev,
        documents: updatedDocs,
        fieldsByDoc: {
          ...prev.fieldsByDoc,
          [documentId]: currentFields,
        },
        logsByDoc: {
          ...prev.logsByDoc,
          [documentId]: [newLog, ...(prev.logsByDoc[documentId] || [])],
        },
      };
    });
  };

  public addField = (documentId: string, field: ExtractedField): ExtractedField => {
    this.setState((prev) => {
      const currentFields = [...(prev.fieldsByDoc[documentId] || []), field];
      const newLog: AuditLog = {
        id: `log-add-${Date.now()}`,
        document_id: documentId,
        tenant_id: field.tenant_id,
        user_id: prev.user.id,
        user_name: prev.user.full_name,
        field_key: field.field_key,
        field_label: field.label,
        old_value: 'Custom Drawn Box',
        new_value: `${field.field_value} @ [${field.bbox.x.toFixed(2)}, ${field.bbox.y.toFixed(2)}]`,
        action: 'OVERRIDE',
        timestamp: new Date().toISOString(),
      };

      const newChunk: DocumentChunk = {
        id: `chunk-add-${Date.now()}`,
        document_id: documentId,
        tenant_id: field.tenant_id,
        content: `${field.label}: ${field.field_value}`,
        page_number: field.page_number,
        similarity_score: 0.985,
      };

      return {
        ...prev,
        fieldsByDoc: {
          ...prev.fieldsByDoc,
          [documentId]: currentFields,
        },
        logsByDoc: {
          ...prev.logsByDoc,
          [documentId]: [newLog, ...(prev.logsByDoc[documentId] || [])],
        },
        chunks: [newChunk, ...prev.chunks],
      };
    });
    return field;
  };

  public deleteField = (documentId: string, fieldId: string) => {
    this.setState((prev) => {
      const existingFields = prev.fieldsByDoc[documentId] || [];
      const targetField = existingFields.find((f) => f.id === fieldId);
      if (!targetField) return prev;

      const remainingFields = existingFields.filter((f) => f.id !== fieldId);
      const verifiedCount = remainingFields.filter((f) => f.status === 'verified').length;
      const newAccuracy =
        remainingFields.length > 0
          ? Number(
              (
                (remainingFields.reduce((acc, f) => acc + f.confidence, 0) /
                  remainingFields.length) *
                100
              ).toFixed(1)
            )
          : 100;
      const allVerified =
        remainingFields.length > 0 && verifiedCount === remainingFields.length;

      const updatedDocs = prev.documents.map((d) =>
        d.id === documentId
          ? {
              ...d,
              accuracy_rate: newAccuracy,
              status: allVerified ? ('verified' as const) : ('review_required' as const),
              updated_at: new Date().toISOString(),
            }
          : d
      );

      const newLog: AuditLog = {
        id: `log-del-${Date.now()}`,
        document_id: documentId,
        tenant_id: targetField.tenant_id,
        user_id: prev.user.id,
        user_name: prev.user.full_name,
        field_key: targetField.field_key,
        field_label: targetField.label,
        old_value: targetField.field_value,
        new_value: 'Removed field box from document',
        action: 'OVERRIDE',
        timestamp: new Date().toISOString(),
      };

      return {
        ...prev,
        documents: updatedDocs,
        fieldsByDoc: {
          ...prev.fieldsByDoc,
          [documentId]: remainingFields,
        },
        logsByDoc: {
          ...prev.logsByDoc,
          [documentId]: [newLog, ...(prev.logsByDoc[documentId] || [])],
        },
      };
    });
  };

  public batchVerifyDocument = (documentId: string) => {
    this.setState((prev) => {
      const currentFields = (prev.fieldsByDoc[documentId] || []).map((f) => ({
        ...f,
        status: 'verified' as const,
        confidence: Math.max(f.confidence, 0.99),
        audited_by: prev.user.full_name,
        updated_at: new Date().toISOString(),
      }));

      const newLog: AuditLog = {
        id: `log-batch-${Date.now()}`,
        document_id: documentId,
        tenant_id: prev.activeTenantId,
        user_id: prev.user.id,
        user_name: prev.user.full_name,
        field_key: 'batch_approval',
        field_label: 'Full Document Sign-Off',
        old_value: 'Needs Review',
        new_value: `All ${currentFields.length} fields approved`,
        action: 'CONFIRM',
        timestamp: new Date().toISOString(),
      };

      const updatedDocs = prev.documents.map((d) =>
        d.id === documentId
          ? {
              ...d,
              status: 'verified' as const,
              accuracy_rate: 99.8,
              updated_at: new Date().toISOString(),
            }
          : d
      );

      return {
        ...prev,
        documents: updatedDocs,
        fieldsByDoc: {
          ...prev.fieldsByDoc,
          [documentId]: currentFields,
        },
        logsByDoc: {
          ...prev.logsByDoc,
          [documentId]: [newLog, ...(prev.logsByDoc[documentId] || [])],
        },
      };
    });
  };

  public ingestDocument = (
    doc: DocumentRecord,
    fields: ExtractedField[],
    chunkContent?: string
  ) => {
    const userDoc: DocumentRecord = {
      ...doc,
      isDemo: doc.isDemo ?? false,
    };

    this.setState((prev) => {
      const initialLog: AuditLog = {
        id: `log-ingest-${Date.now()}`,
        document_id: userDoc.id,
        tenant_id: userDoc.tenant_id,
        user_id: prev.user.id,
        user_name: 'Document Parser',
        field_key: 'document_upload',
        field_label: 'Initial Field Extraction',
        new_value: `${fields.length} fields extracted (${userDoc.accuracy_rate}% confidence)`,
        action: 'AUTO_EXTRACT',
        timestamp: new Date().toISOString(),
      };

      const newChunk: DocumentChunk = {
        id: `chunk-${Date.now()}`,
        document_id: userDoc.id,
        tenant_id: userDoc.tenant_id,
        content:
          chunkContent ||
          `${userDoc.file_name} (${userDoc.vendor_name || 'Uploaded Document'}) — ${fields
            .map((f) => `${f.label}: ${f.field_value}`)
            .join(' • ')}`,
        page_number: 1,
        similarity_score: 0.96,
      };

      return {
        ...prev,
        documents: [userDoc, ...prev.documents],
        fieldsByDoc: {
          ...prev.fieldsByDoc,
          [userDoc.id]: fields,
        },
        logsByDoc: {
          ...prev.logsByDoc,
          [userDoc.id]: [initialLog],
        },
        chunks: [newChunk, ...prev.chunks],
      };
    });

    // Auto-push to Supabase if connected
    if (this.state.byokConfig.supabaseUrl && this.state.byokConfig.supabaseAnonKey) {
      this.syncWithSupabase('push').catch(() => {});
    }
  };

  public replaceDocumentExtraction = (
    documentId: string,
    newFields: ExtractedField[],
    updates: Partial<DocumentRecord>,
    engineLabel: string
  ) => {
    this.setState((prev) => {
      const avgConf =
        newFields.length > 0
          ? newFields.reduce((acc, f) => acc + f.confidence, 0) / newFields.length
          : 0.94;

      const updatedDocs = prev.documents.map((d) =>
        d.id === documentId
          ? {
              ...d,
              ...updates,
              accuracy_rate: Number((avgConf * 100).toFixed(1)),
              extraction_engine: engineLabel,
              updated_at: new Date().toISOString(),
            }
          : d
      );

      const newLog: AuditLog = {
        id: `log-ai-${Date.now()}`,
        document_id: documentId,
        tenant_id: prev.activeTenantId,
        user_id: prev.user.id,
        user_name: engineLabel,
        field_key: 'ai_extraction',
        field_label: 'AI Document Extraction',
        new_value: `Extracted ${newFields.length} fields via ${engineLabel}`,
        action: 'AUTO_EXTRACT',
        timestamp: new Date().toISOString(),
      };

      return {
        ...prev,
        documents: updatedDocs,
        fieldsByDoc: {
          ...prev.fieldsByDoc,
          [documentId]: newFields,
        },
        logsByDoc: {
          ...prev.logsByDoc,
          [documentId]: [newLog, ...(prev.logsByDoc[documentId] || [])],
        },
      };
    });
  };

  public deleteDocument = (documentId: string) => {
    const targetDoc = this.state.documents.find((d) => d.id === documentId);
    if (typeof window !== 'undefined' && targetDoc?.file_url?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(targetDoc.file_url);
      } catch {
        // Ignore revoke error
      }
    }

    const { supabaseUrl, supabaseAnonKey } = this.state.byokConfig;
    if (supabaseUrl?.trim() && supabaseAnonKey?.trim()) {
      const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
      const headers = {
        apikey: supabaseAnonKey.trim(),
        Authorization: `Bearer ${supabaseAnonKey.trim()}`,
      };
      fetch(
        `${cleanUrl}/rest/v1/extracted_fields?document_id=eq.${encodeURIComponent(documentId)}`,
        { method: 'DELETE', headers }
      ).catch(() => {});
      fetch(`${cleanUrl}/rest/v1/documents?id=eq.${encodeURIComponent(documentId)}`, {
        method: 'DELETE',
        headers,
      }).catch(() => {});
    }

    this.setState((prev) => {
      const nextFields = { ...prev.fieldsByDoc };
      const nextLogs = { ...prev.logsByDoc };
      delete nextFields[documentId];
      delete nextLogs[documentId];
      return {
        ...prev,
        documents: prev.documents.filter((d) => d.id !== documentId),
        fieldsByDoc: nextFields,
        logsByDoc: nextLogs,
        chunks: prev.chunks.filter((c) => c.document_id !== documentId),
      };
    });
  };

  public toggleHideDemoSamples = () => {
    this.setState((prev) => ({
      ...prev,
      hideDemoSamples: !prev.hideDemoSamples,
    }));
  };

  public clearDemoSamples = () => {
    this.setState((prev) => {
      const demoIds = new Set(prev.documents.filter((d) => d.isDemo).map((d) => d.id));
      const nextFields = { ...prev.fieldsByDoc };
      demoIds.forEach((id) => delete nextFields[id]);
      return {
        ...prev,
        documents: prev.documents.filter((d) => !d.isDemo),
        fieldsByDoc: nextFields,
        chunks: prev.chunks.filter((c) => !demoIds.has(c.document_id)),
      };
    });
  };

  public restoreDemoSamples = () => {
    this.setState((prev) => {
      const existingIds = new Set(prev.documents.map((d) => d.id));
      const missingDemos = MOCK_DOCUMENTS.filter((d) => !existingIds.has(d.id));
      return {
        ...prev,
        documents: [...prev.documents, ...missingDemos],
        fieldsByDoc: { ...MOCK_FIELDS, ...prev.fieldsByDoc },
        hideDemoSamples: false,
      };
    });
  };

  public switchTenant = (tenantId: string) => {
    this.setState((prev) => ({
      ...prev,
      activeTenantId: tenantId,
    }));
  };

  public updateThresholds = (partial: Partial<ThresholdSettings>) => {
    this.setState((prev) => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        ...partial,
      },
    }));
  };

  public updateUserProfile = (partial: Partial<UserProfile>) => {
    this.setState((prev) => ({
      ...prev,
      user: {
        ...prev.user,
        ...partial,
      },
    }));
  };

  public promptByokForUnsupportedFile = (fileName: string | null) => {
    this.setState((prev) => ({
      ...prev,
      byokPromptFileName: fileName,
    }));
  };

  public setCloudStorageModalOpen = (open: boolean) => {
    this.setState((prev) => ({
      ...prev,
      isCloudStorageModalOpen: open,
    }));
  };

  public requestFileConfirmation = (pending: PendingFileConfirmation | null) => {
    this.setState((prev) => ({
      ...prev,
      pendingFileConfirmation: pending,
    }));
  };

  public saveCloudStorageConfig = (partial: Partial<CloudStorageConfig>): CloudStorageConfig => {
    let nextCloud: CloudStorageConfig =
      this.state.byokConfig.cloudStorage || DEFAULT_CLOUD_STORAGE;
    this.setState((prev) => {
      nextCloud = {
        ...(prev.byokConfig.cloudStorage || DEFAULT_CLOUD_STORAGE),
        ...partial,
      };
      return {
        ...prev,
        byokConfig: {
          ...prev.byokConfig,
          cloudStorage: nextCloud,
        },
      };
    });
    return nextCloud;
  };

  public fetchSupabaseSearchItems = async (
    searchQuery = ''
  ): Promise<RemoteStorageItem[]> => {
    const { supabaseUrl, supabaseAnonKey } = this.state.byokConfig;
    const builtInSupabaseItems: RemoteStorageItem[] = [
      {
        id: 'supa-doc-1',
        key: 'public.documents/Supabase_Stripe_Payout_Reconciliation_2026.pdf',
        fileName: 'Supabase_Stripe_Payout_Reconciliation_2026.pdf',
        size: 214500,
        contentType: 'application/pdf',
        lastModified: '2026-10-10T16:10:00Z',
        source: 'supabase',
        sourceLabel: 'Supabase PostgreSQL',
        bucketName: 'public.documents',
        documentType: 'INVOICE',
        vendorName: 'Stripe Payments Europe, Ltd.',
        rawText: `Vendor Name: Stripe Payments Europe, Ltd.
Reference Number: SUPA-STRIPE-2026-4410
Settlement Date: October 10, 2026
Account: Enterprise Merchant Settlement Vault (Supabase Synced)
Gross Processing Volume: $148,920.00 USD
Platform Processing Fees (1.9%): $2,829.48 USD
Refunds & Chargebacks: $0.00 USD
Net Payout Transferred: $146,090.52 USD
Compliance Verification: PCI-DSS Level 1 & SOC 1 Type II Verified`,
      },
      {
        id: 'supa-doc-2',
        key: 'public.documents/Supabase_Series_B_Audit_Balance_Sheet_Q3.pdf',
        fileName: 'Supabase_Series_B_Audit_Balance_Sheet_Q3.pdf',
        size: 318200,
        contentType: 'application/pdf',
        lastModified: '2026-10-08T12:30:00Z',
        source: 'supabase',
        sourceLabel: 'Supabase PostgreSQL',
        bucketName: 'public.documents',
        documentType: 'BALANCE_SHEET',
        vendorName: 'Deloitte & Touche LLP / Acme Corp',
        rawText: `CONSOLIDATED BALANCE SHEET & AUDIT STATEMENT (Q3 2026)
Reporting Entity: Acme Global Technologies Inc.
Audited By: Deloitte & Touche LLP | Reference: AUD-SUPA-2026-Q3
Total Cash & Cash Equivalents: $18,450,000.00 USD
Accounts Receivable (Net): $4,120,500.00 USD
Cloud Infrastructure & IP Assets: $6,890,000.00 USD
Total Assets: $29,460,500.00 USD
Total Current Liabilities: $3,210,000.00 USD
Total Stockholders Equity: $26,250,500.00 USD
Audit Opinion: Unqualified / Clean GAAP Compliance`,
      },
    ];

    const liveItems: RemoteStorageItem[] = [];

    if (supabaseUrl?.trim() && supabaseAnonKey?.trim()) {
      try {
        const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/rest/v1/documents?select=*&order=created_at.desc`, {
          headers: {
            apikey: supabaseAnonKey.trim(),
            Authorization: `Bearer ${supabaseAnonKey.trim()}`,
          },
        });
        if (res.ok) {
          const rows = (await res.json()) as Array<Record<string, unknown>>;
          for (const row of rows) {
            const title = String(row.title || row.file_name || `Supabase_Doc_${row.id}.pdf`);
            liveItems.push({
              id: `supa-live-${row.id}`,
              key: `public.documents/${title}`,
              fileName: title,
              size: Number(row.file_size || 184320),
              contentType: title.endsWith('.csv')
                ? 'text/csv'
                : title.endsWith('.docx')
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/pdf',
              lastModified: String(row.updated_at || row.created_at || new Date().toISOString()),
              source: 'supabase',
              sourceLabel: 'Supabase PostgreSQL',
              bucketName: 'public.documents',
              documentType: (String(row.document_type || 'INVOICE').toUpperCase() as DocumentRecord['document_type']),
              vendorName: String(row.vendor_name || title),
              rawText: String(
                row.raw_text ||
                  `Document Title: ${title}\nDocument ID: ${row.id}\nType: ${row.document_type || 'INVOICE'}\nConfidence: ${
                    Number(row.overall_confidence || 0.96) * 100
                  }%\nSource: Supabase PostgreSQL Table public.documents`
              ),
            });
          }
        }
      } catch {
        // Ignore network errors and include built-in Supabase items
      }
    }

    const combined = [...liveItems, ...builtInSupabaseItems];
    if (!searchQuery.trim()) return combined;

    const q = searchQuery.toLowerCase().trim();
    return combined.filter(
      (i) =>
        i.fileName.toLowerCase().includes(q) ||
        i.key.toLowerCase().includes(q) ||
        (i.vendorName && i.vendorName.toLowerCase().includes(q)) ||
        (i.documentType && i.documentType.toLowerCase().includes(q))
    );
  };

  public saveByokConfig = (config: Partial<ByokConfig>): ByokConfig => {
    let nextConfig: ByokConfig = this.state.byokConfig;
    this.setState((prev) => {
      const supabaseUrl = config.supabaseUrl ?? prev.byokConfig.supabaseUrl;
      const supabaseAnonKey = config.supabaseAnonKey ?? prev.byokConfig.supabaseAnonKey;
      const geminiApiKey = config.geminiApiKey ?? prev.byokConfig.geminiApiKey;
      const openaiApiKey = config.openaiApiKey ?? prev.byokConfig.openaiApiKey;
      const llmApiKey =
        config.llmApiKey ?? (geminiApiKey || openaiApiKey || prev.byokConfig.llmApiKey);

      const activeKey = geminiApiKey || openaiApiKey || llmApiKey || '';
      const detected = detectAiProviderFromKey(activeKey);

      nextConfig = {
        ...prev.byokConfig,
        ...config,
        supabaseUrl,
        supabaseAnonKey,
        geminiApiKey,
        openaiApiKey,
        llmApiKey,
        detectedProviderName: activeKey ? detected.shortLabel : '',
        preferredExtractionMode:
          config.preferredExtractionMode ??
          (activeKey ? prev.byokConfig.preferredExtractionMode || 'ai' : 'local'),
        isSupabaseConnected: !!(supabaseUrl && supabaseAnonKey),
        isLiveConnected: !!(supabaseUrl || geminiApiKey || openaiApiKey || llmApiKey),
      };
      return {
        ...prev,
        byokConfig: nextConfig,
      };
    });
    return nextConfig;
  };

  public clearByokConfig = () => {
    this.setState((prev) => ({
      ...prev,
      byokConfig: DEFAULT_BYOK,
    }));
  };

  public syncWithSupabase = async (
    direction: 'both' | 'pull' | 'push' = 'both'
  ): Promise<{ ok: boolean; message: string; tablesMissing?: boolean }> => {
    const { supabaseUrl, supabaseAnonKey } = this.state.byokConfig;
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      return {
        ok: false,
        message: 'Please enter your Supabase Project URL and Anon Public Key first.',
      };
    }

    const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    const headers: Record<string, string> = {
      apikey: supabaseAnonKey.trim(),
      Authorization: `Bearer ${supabaseAnonKey.trim()}`,
      'Content-Type': 'application/json',
    };

    try {
      // 1. Check / Pull from Supabase `documents` table
      const checkRes = await fetch(`${cleanUrl}/rest/v1/documents?select=*&order=created_at.desc`, {
        headers,
      });

      if (checkRes.status === 404 || checkRes.status === 400) {
        return {
          ok: false,
          tablesMissing: true,
          message:
            'Connected to Supabase, but the "documents" table does not exist yet. Click "Copy Quickstart SQL" below and run it in your Supabase SQL Editor.',
        };
      }

      if (!checkRes.ok) {
        return {
          ok: false,
          message: `Supabase returned HTTP ${checkRes.status}. Check your URL and Anon Key.`,
        };
      }

      let pulledDocsCount = 0;
      let pushedDocsCount = 0;

      if (direction === 'pull' || direction === 'both') {
        const remoteDocs = (await checkRes.json()) as Array<Record<string, unknown>>;
        const fieldsRes = await fetch(`${cleanUrl}/rest/v1/extracted_fields?select=*`, {
          headers,
        });
        const remoteFields: Array<Record<string, unknown>> = fieldsRes.ok
          ? await fieldsRes.json()
          : [];

        if (Array.isArray(remoteDocs) && remoteDocs.length > 0) {
          pulledDocsCount = remoteDocs.length;
          this.setState((prev) => {
            const localById = new Map(prev.documents.map((d) => [d.id, d]));
            remoteDocs.forEach((rd) => {
              const id = String(rd.id || `doc-supa-${Date.now()}`);
              const fileName = String(rd.file_name || rd.title || `Supabase_Doc_${id}.pdf`);
              const rawConf = Number(rd.overall_confidence || 0);
              const accRate =
                Number(rd.accuracy_rate) ||
                (rawConf > 0 && rawConf <= 1 ? Number((rawConf * 100).toFixed(1)) : 98.5);
              const rawStatus = String(rd.status || 'review_required');
              const normalizedStatus: DocumentRecord['status'] =
                rawStatus === 'verified' ||
                rawStatus === 'review_required' ||
                rawStatus === 'processing' ||
                rawStatus === 'queued' ||
                rawStatus === 'failed'
                  ? rawStatus
                  : 'review_required';
              const rawDocType = String(rd.document_type || 'INVOICE').toUpperCase();
              const normalizedDocType: DocumentType =
                rawDocType === 'INVOICE' ||
                rawDocType === 'CONTRACT' ||
                rawDocType === 'BALANCE_SHEET' ||
                rawDocType === 'AUDIT_STATEMENT' ||
                rawDocType === 'RESUME' ||
                rawDocType === 'GENERAL'
                  ? rawDocType
                  : 'GENERAL';

              localById.set(id, {
                id,
                tenant_id: String(rd.tenant_id || 'a0000000-0000-0000-0000-000000000001'),
                file_name: fileName,
                file_url: String(rd.file_url || rd.storage_path || `/samples/${fileName}`),
                file_size: Number(rd.file_size) || 120000,
                page_count: Math.max(1, Number(rd.page_count) || 1),
                status: normalizedStatus,
                document_type: normalizedDocType,
                vendor_name: String(rd.vendor_name || fileName),
                accuracy_rate: accRate,
                processing_time_ms: Number(rd.processing_time_ms) || 450,
                created_at: String(rd.created_at || new Date().toISOString()),
                updated_at: String(rd.updated_at || new Date().toISOString()),
                extraction_engine: String(
                  rd.extraction_engine || 'Supabase Cloud PostgreSQL'
                ),
                raw_text: typeof rd.raw_text === 'string' ? rd.raw_text : undefined,
                isDemo: false,
              });
            });

            const nextFieldsByDoc = { ...prev.fieldsByDoc };
            remoteFields.forEach((rf) => {
              const docId = String(rf.document_id || '');
              const fieldId = String(rf.id || '');
              if (!docId || !fieldId) return;
              const list = nextFieldsByDoc[docId] || [];
              if (!list.some((existing) => existing.id === fieldId)) {
                const rawBbox = rf.bbox as NormalizedBBox | undefined;
                const bbox: NormalizedBBox =
                  rawBbox && typeof rawBbox.x === 'number'
                    ? rawBbox
                    : {
                        x: Number(rf.bbox_x ?? 0.06),
                        y: Number(rf.bbox_y ?? 0.12),
                        w: Number(rf.bbox_width ?? 0.88),
                        h: Number(rf.bbox_height ?? 0.14),
                      };
                const rawStatus = String(rf.status || 'verified');
                const normalizedFieldStatus: ExtractedField['status'] =
                  rawStatus === 'verified' ||
                  rawStatus === 'flagged' ||
                  rawStatus === 'raw'
                    ? rawStatus
                    : 'verified';

                nextFieldsByDoc[docId] = [
                  ...list,
                  {
                    id: fieldId,
                    document_id: docId,
                    tenant_id: String(rf.tenant_id || 'a0000000-0000-0000-0000-000000000001'),
                    field_key: String(rf.field_key || 'extracted_item'),
                    label: String(rf.label || rf.field_label || 'Extracted Field'),
                    field_value: String(rf.field_value ?? ''),
                    confidence: Number(rf.confidence) || 0.95,
                    page_number: Math.max(1, Number(rf.page_number) || 1),
                    bbox,
                    status: normalizedFieldStatus,
                    category: String(rf.category || 'Extracted Details'),
                    audited_by: typeof rf.audited_by === 'string' ? rf.audited_by : undefined,
                  },
                ];
              }
            });

            // Recalibrate pulled document fields so bounding boxes never overlap
            for (const [docId, docFields] of Object.entries(nextFieldsByDoc)) {
              const docRec = localById.get(docId);
              if (docRec && !docRec.isDemo && docFields.length > 0) {
                const recalibrated = recalibrateDocumentFieldsLayout(docFields);
                const maxPage = Math.max(
                  1,
                  recalibrated.reduce((m, f) => Math.max(m, f.page_number || 1), 1)
                );
                nextFieldsByDoc[docId] = recalibrated;
                localById.set(docId, {
                  ...docRec,
                  page_count: maxPage,
                });
              }
            }

            return {
              ...prev,
              documents: Array.from(localById.values()),
              fieldsByDoc: nextFieldsByDoc,
              byokConfig: {
                ...prev.byokConfig,
                isSupabaseConnected: true,
              },
            };
          });
        }
      }

      if (direction === 'push' || direction === 'both') {
        const richDocsToPush = this.state.documents.map((d) => ({
          id: d.id,
          tenant_id: d.tenant_id || 'a0000000-0000-0000-0000-000000000001',
          title: d.file_name,
          file_name: d.file_name,
          file_url: d.file_url?.startsWith('data:') ? '/uploaded/local-image' : d.file_url,
          storage_path: d.file_url?.startsWith('data:') ? '/uploaded/local-image' : d.file_url,
          file_size: d.file_size,
          page_count: d.page_count,
          status: d.status,
          document_type: d.document_type,
          vendor_name: d.vendor_name || 'Uploaded Document',
          accuracy_rate: d.accuracy_rate,
          overall_confidence: Number(((d.accuracy_rate || 98.5) / 100).toFixed(4)),
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));

        if (richDocsToPush.length > 0) {
          let pushDocsRes = await fetch(`${cleanUrl}/rest/v1/documents`, {
            method: 'POST',
            headers: {
              ...headers,
              Prefer: 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify(richDocsToPush),
          });

          // Automatic fallback if remote table was created with legacy minimal columns
          if (!pushDocsRes.ok && pushDocsRes.status === 400) {
            const minimalDocs = this.state.documents.map((d) => ({
              id: d.id,
              tenant_id: d.tenant_id || 'a0000000-0000-0000-0000-000000000001',
              title: d.file_name,
              document_type: d.document_type,
              status: d.status,
              page_count: d.page_count,
              storage_path: d.file_url?.startsWith('data:') ? '/uploaded/local-image' : d.file_url,
              overall_confidence: Number(((d.accuracy_rate || 98.5) / 100).toFixed(4)),
              created_at: d.created_at,
              updated_at: d.updated_at,
            }));
            pushDocsRes = await fetch(`${cleanUrl}/rest/v1/documents`, {
              method: 'POST',
              headers: {
                ...headers,
                Prefer: 'resolution=merge-duplicates,return=minimal',
              },
              body: JSON.stringify(minimalDocs),
            });
          }

          if (pushDocsRes.ok) {
            pushedDocsCount = richDocsToPush.length;
            const richFieldsToPush = Object.values(this.state.fieldsByDoc)
              .flat()
              .map((f) => ({
                id: f.id,
                document_id: f.document_id,
                tenant_id: f.tenant_id || 'a0000000-0000-0000-0000-000000000001',
                field_key: f.field_key,
                label: f.label,
                field_label: f.label,
                field_value: f.field_value,
                confidence: f.confidence,
                page_number: f.page_number,
                bbox: f.bbox,
                status: f.status,
                category: f.category,
                audited_by: f.audited_by || null,
              }));

            if (richFieldsToPush.length > 0) {
              const pushFieldsRes = await fetch(`${cleanUrl}/rest/v1/extracted_fields`, {
                method: 'POST',
                headers: {
                  ...headers,
                  Prefer: 'resolution=merge-duplicates,return=minimal',
                },
                body: JSON.stringify(richFieldsToPush),
              });

              if (!pushFieldsRes.ok && pushFieldsRes.status === 400) {
                const minimalFields = Object.values(this.state.fieldsByDoc)
                  .flat()
                  .map((f) => ({
                    id: f.id,
                    document_id: f.document_id,
                    tenant_id: f.tenant_id || 'a0000000-0000-0000-0000-000000000001',
                    field_key: f.field_key,
                    field_label: f.label,
                    field_value: f.field_value,
                    confidence: f.confidence,
                    page_number: f.page_number,
                    bbox: f.bbox,
                    status: f.status,
                  }));
                await fetch(`${cleanUrl}/rest/v1/extracted_fields`, {
                  method: 'POST',
                  headers: {
                    ...headers,
                    Prefer: 'resolution=merge-duplicates,return=minimal',
                  },
                  body: JSON.stringify(minimalFields),
                });
              }
            }
          }
        }
      }

      this.setState((prev) => ({
        ...prev,
        byokConfig: {
          ...prev.byokConfig,
          isSupabaseConnected: true,
        },
      }));

      return {
        ok: true,
        message: `Supabase Sync Complete (${pushedDocsCount} pushed, ${pulledDocsCount} pulled).`,
      };
    } catch {
      return {
        ok: false,
        message: 'Could not reach Supabase URL. Verify the Project URL and network connection.',
      };
    }
  };

  public getMemoryUsageStats = (sourceState: AppState = this.state): MemoryUsageStats => {
    const uploadedDocs = sourceState.documents.filter((d) => !d.isDemo);
    const demoDocs = sourceState.documents.filter((d) => d.isDemo);
    const totalFieldsCount = Object.values(sourceState.fieldsByDoc).reduce(
      (acc, list) => acc + list.length,
      0
    );
    const uploadedFieldsCount = uploadedDocs.reduce(
      (acc, d) => acc + (sourceState.fieldsByDoc[d.id]?.length || 0),
      0
    );
    const totalChunksCount = sourceState.chunks.length;

    let bytesUsed = 0;
    if (sourceState.documents.length > 0 || totalFieldsCount > 0) {
      try {
        const serialized = JSON.stringify({
          documents: sourceState.documents,
          fieldsByDoc: sourceState.fieldsByDoc,
          logsByDoc: sourceState.logsByDoc,
          chunks: sourceState.chunks,
        });
        bytesUsed = serialized.length;
      } catch {
        bytesUsed = 0;
      }
    }

    const formattedSize =
      bytesUsed === 0
        ? '0 KB'
        : bytesUsed < 1024
        ? `${bytesUsed} B`
        : bytesUsed < 1024 * 1024
        ? `${(bytesUsed / 1024).toFixed(1)} KB`
        : `${(bytesUsed / (1024 * 1024)).toFixed(2)} MB`;

    return {
      bytesUsed,
      formattedSize,
      uploadedDocsCount: uploadedDocs.length,
      demoDocsCount: demoDocs.length,
      totalDocsCount: sourceState.documents.length,
      totalFieldsCount,
      uploadedFieldsCount,
      totalChunksCount,
    };
  };

  public clearUploadedDocumentsMemory = () => {
    const uploadedDocs = this.state.documents.filter((d) => !d.isDemo);
    if (typeof window !== 'undefined') {
      for (const doc of uploadedDocs) {
        if (doc.file_url?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(doc.file_url);
          } catch {
            // Ignore revoke error
          }
        }
      }
    }

    const { supabaseUrl, supabaseAnonKey } = this.state.byokConfig;
    if (supabaseUrl?.trim() && supabaseAnonKey?.trim() && uploadedDocs.length > 0) {
      const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
      const headers = {
        apikey: supabaseAnonKey.trim(),
        Authorization: `Bearer ${supabaseAnonKey.trim()}`,
      };
      for (const doc of uploadedDocs) {
        fetch(
          `${cleanUrl}/rest/v1/extracted_fields?document_id=eq.${encodeURIComponent(doc.id)}`,
          { method: 'DELETE', headers }
        ).catch(() => {});
        fetch(`${cleanUrl}/rest/v1/documents?id=eq.${encodeURIComponent(doc.id)}`, {
          method: 'DELETE',
          headers,
        }).catch(() => {});
      }
    }

    this.setState((prev) => {
      const demoDocs = prev.documents.filter((d) => d.isDemo);
      const demoDocIds = new Set(demoDocs.map((d) => d.id));

      const nextFields: Record<string, ExtractedField[]> = {};
      const nextLogs: Record<string, AuditLog[]> = {};

      for (const id of demoDocIds) {
        if (prev.fieldsByDoc[id]) nextFields[id] = prev.fieldsByDoc[id];
        if (prev.logsByDoc[id]) nextLogs[id] = prev.logsByDoc[id];
      }

      return {
        ...prev,
        documents: demoDocs,
        fieldsByDoc: nextFields,
        logsByDoc: nextLogs,
        chunks: prev.chunks.filter((c) => demoDocIds.has(c.document_id)),
      };
    });
  };

  public clearAllWebsiteMemory = (options?: {
    keepCredentials?: boolean;
    keepDemos?: boolean;
  }) => {
    const keepCredentials = options?.keepCredentials ?? true;
    const keepDemos = options?.keepDemos ?? true;

    if (typeof window !== 'undefined') {
      for (const doc of this.state.documents) {
        if (doc.file_url?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(doc.file_url);
          } catch {
            // Ignore revoke error
          }
        }
      }

      try {
        window.localStorage.clear();
      } catch {
        // Ignore storage clear error
      }
      try {
        window.sessionStorage.clear();
      } catch {
        // Ignore session storage clear error
      }
      if ('caches' in window) {
        window.caches
          .keys()
          .then((names) => Promise.all(names.map((n) => window.caches.delete(n))))
          .catch(() => {});
      }

      fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_cache' }),
      }).catch(() => {});
    }

    const preservedByok = keepCredentials ? this.state.byokConfig : DEFAULT_BYOK;
    const preservedThresholds = keepCredentials
      ? this.state.thresholds
      : DEFAULT_THRESHOLDS;

    this.state = {
      documents: keepDemos ? MOCK_DOCUMENTS : [],
      fieldsByDoc: keepDemos ? MOCK_FIELDS : {},
      logsByDoc: keepDemos ? MOCK_AUDIT_LOGS : {},
      chunks: keepDemos ? MOCK_CHUNKS : [],
      tenants: MOCK_TENANTS,
      activeTenantId: MOCK_TENANTS[0].id,
      user: MOCK_USER,
      thresholds: preservedThresholds,
      byokConfig: preservedByok,
      hideDemoSamples: !keepDemos,
      byokPromptFileName: null,
      isCloudStorageModalOpen: false,
      pendingFileConfirmation: null,
    };

    this.persist();
    this.listeners.forEach((l) => l());
  };

  public resetWorkspace = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY_STATE);
    }
    this.state = createDefaultState();
    this.persist();
    this.listeners.forEach((l) => l());
  };

  public searchHybrid = (query: string) => {
    const lower = query.toLowerCase().trim();
    const activeDocs = this.getFilteredDocuments();
    const activeDocIds = new Set(activeDocs.map((d) => d.id));

    if (!lower) {
      return {
        documents: [] as DocumentRecord[],
        matchedFields: [] as ExtractedField[],
        chunks: [] as DocumentChunk[],
      };
    }

    const terms = lower.split(/\s+/).filter(Boolean);
    const matchesTerms = (text: string) => {
      const hay = text.toLowerCase();
      return terms.some((t) => hay.includes(t));
    };

    const documents = activeDocs.filter(
      (d) =>
        matchesTerms(d.file_name) ||
        matchesTerms(d.vendor_name || '') ||
        matchesTerms(d.document_type)
    );

    const matchedFields: ExtractedField[] = [];
    Object.entries(this.state.fieldsByDoc).forEach(([docId, list]) => {
      if (!activeDocIds.has(docId)) return;
      list.forEach((f) => {
        if (
          matchesTerms(f.label) ||
          matchesTerms(f.field_value) ||
          matchesTerms(f.field_key)
        ) {
          matchedFields.push(f);
        }
      });
    });

    const chunks = this.state.chunks.filter(
      (c) => activeDocIds.has(c.document_id) && matchesTerms(c.content)
    );

    return {
      documents,
      matchedFields,
      chunks,
    };
  };
}

export const appStore = new AppStoreManager();

const SERVER_SNAPSHOT: AppState = createDefaultState();

export function useAppStore() {
  const state = useSyncExternalStore(
    appStore.subscribe,
    appStore.getState,
    () => SERVER_SNAPSHOT
  );

  useEffect(() => {
    appStore.ensureHydrated();
  }, []);

  return {
    ...state,
    documents: appStore.getFilteredDocuments(state),
    allDocuments: state.documents,
    telemetry: appStore.getTelemetry(state),
    memoryStats: appStore.getMemoryUsageStats(state),
    activeTenant:
      state.tenants.find((t) => t.id === state.activeTenantId) || state.tenants[0],
    updateField: appStore.updateField,
    addField: appStore.addField,
    deleteField: appStore.deleteField,
    batchVerifyDocument: appStore.batchVerifyDocument,
    ingestDocument: appStore.ingestDocument,
    replaceDocumentExtraction: appStore.replaceDocumentExtraction,
    deleteDocument: appStore.deleteDocument,
    toggleHideDemoSamples: appStore.toggleHideDemoSamples,
    clearDemoSamples: appStore.clearDemoSamples,
    restoreDemoSamples: appStore.restoreDemoSamples,
    clearUploadedDocumentsMemory: appStore.clearUploadedDocumentsMemory,
    clearAllWebsiteMemory: appStore.clearAllWebsiteMemory,
    switchTenant: appStore.switchTenant,
    updateThresholds: appStore.updateThresholds,
    updateUserProfile: appStore.updateUserProfile,
    saveByokConfig: appStore.saveByokConfig,
    clearByokConfig: appStore.clearByokConfig,
    promptByokForUnsupportedFile: appStore.promptByokForUnsupportedFile,
    setCloudStorageModalOpen: appStore.setCloudStorageModalOpen,
    saveCloudStorageConfig: appStore.saveCloudStorageConfig,
    requestFileConfirmation: appStore.requestFileConfirmation,
    fetchSupabaseSearchItems: appStore.fetchSupabaseSearchItems,
    syncWithSupabase: appStore.syncWithSupabase,
    resetWorkspace: appStore.resetWorkspace,
    searchHybrid: appStore.searchHybrid,
  };
}
