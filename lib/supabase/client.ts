import { createClient } from '@supabase/supabase-js';
import { appStore } from '@/store/useAppStore';
import {
  DocumentRecord,
  ExtractedField,
  AuditLog,
  TelemetryKPIs,
  ByokConfig,
  Tenant,
  UserProfile,
} from '../extraction/types';

class DocuLensDataStore {
  public getByokConfig(): ByokConfig {
    return appStore.getState().byokConfig;
  }

  public saveByokConfig(config: Partial<ByokConfig>): ByokConfig {
    return appStore.saveByokConfig(config);
  }

  public getSupabaseClient() {
    const config = this.getByokConfig();
    if (config.supabaseUrl && config.supabaseAnonKey) {
      try {
        return createClient(config.supabaseUrl, config.supabaseAnonKey);
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
      }
    }
    return null;
  }

  public getDocuments(): DocumentRecord[] {
    return appStore.getState().documents;
  }

  public getDocumentById(id: string): DocumentRecord | undefined {
    return appStore.getState().documents.find((d) => d.id === id);
  }

  public getExtractedFields(documentId: string): ExtractedField[] {
    return appStore.getState().fieldsByDoc[documentId] || [];
  }

  public getAuditLogs(documentId: string): AuditLog[] {
    return appStore.getState().logsByDoc[documentId] || [];
  }

  public updateField(
    documentId: string,
    fieldId: string,
    newValue: string,
    action: 'OVERRIDE' | 'CONFIRM' | 'FLAG',
    _user?: UserProfile
  ): { field: ExtractedField; log: AuditLog } {
    appStore.updateField(documentId, fieldId, newValue, action);
    const fields = this.getExtractedFields(documentId);
    const logs = this.getAuditLogs(documentId);
    const field = fields.find((f) => f.id === fieldId) || fields[0];
    const log = logs[0];
    return { field, log };
  }

  public batchVerifyAll(documentId: string, _user?: UserProfile): void {
    appStore.batchVerifyDocument(documentId);
  }

  public addDocument(doc: DocumentRecord, fields: ExtractedField[]): void {
    appStore.ingestDocument(doc, fields);
  }

  public getTelemetry(): TelemetryKPIs {
    return appStore.getTelemetry();
  }

  public getTenants(): Tenant[] {
    return appStore.getState().tenants;
  }

  public searchHybrid(query: string) {
    return appStore.searchHybrid(query);
  }
}

export const dataStore = new DocuLensDataStore();
