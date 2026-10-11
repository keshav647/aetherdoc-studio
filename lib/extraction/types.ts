export interface NormalizedBBox {
  x: number; // 0.0 to 1.0 (relative to page width)
  y: number; // 0.0 to 1.0 (relative to page height)
  w: number; // 0.0 to 1.0
  h: number; // 0.0 to 1.0
}

export type FieldCategory = string;

export type FieldStatus = 'raw' | 'verified' | 'flagged';

export type DocumentStatus =
  | 'queued'
  | 'processing'
  | 'review_required'
  | 'verified'
  | 'failed';

export type DocumentType =
  | 'INVOICE'
  | 'CONTRACT'
  | 'BALANCE_SHEET'
  | 'AUDIT_STATEMENT'
  | 'RESUME'
  | 'GENERAL';

export interface ExtractedField {
  id: string;
  document_id: string;
  tenant_id: string;
  field_key: string;
  label: string;
  field_value: string;
  normalized_value?: string;
  confidence: number; // 0.00 to 1.00
  page_number: number;
  bbox: NormalizedBBox;
  status: FieldStatus;
  category: FieldCategory;
  audited_by?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  document_id: string;
  tenant_id: string;
  user_id?: string;
  user_name?: string;
  field_key: string;
  field_label?: string;
  old_value?: string;
  new_value: string;
  action: 'OVERRIDE' | 'CONFIRM' | 'FLAG' | 'AUTO_EXTRACT';
  timestamp: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  tenant_id: string;
  content: string;
  page_number: number;
  similarity_score?: number;
}

export interface DocumentRecord {
  id: string;
  tenant_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  page_count: number;
  status: DocumentStatus;
  document_type: DocumentType;
  accuracy_rate: number;
  processing_time_ms: number;
  created_at: string;
  updated_at: string;
  vendor_name?: string;
  isDemo?: boolean;
  extraction_engine?: string;
  raw_text?: string;
  fields?: ExtractedField[];
  audit_logs?: AuditLog[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'auditor' | 'viewer';
  avatar_url?: string;
}

export interface TelemetryKPIs {
  globalAccuracy: number;
  averageReviewTimeSeconds: number;
  anomalyRate: number;
  totalDocuments: number;
  pendingReviewCount: number;
  reconciledCount: number;
  throughputPerDay: number;
}

export type CloudStorageProviderId =
  | 'cloudflare_r2'
  | 'aws_s3'
  | 'azure_blob'
  | 'gcs'
  | 'custom_s3';

export interface CloudStorageConfig {
  provider: CloudStorageProviderId;
  endpointUrl: string;
  bucketName: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  accountId?: string;
  sasOrPublicUrl?: string;
  sasToken?: string;
  publicUrlBase?: string;
  lastSyncedAt?: string;
  isConnected: boolean;
}

export interface RemoteStorageItem {
  id: string;
  key: string;
  fileName: string;
  size: number;
  contentType: string;
  lastModified: string;
  source: CloudStorageProviderId | 'supabase';
  sourceLabel: string;
  bucketName: string;
  rawText?: string;
  downloadUrl?: string;
  documentType?: DocumentType;
  vendorName?: string;
}

export interface PendingFileConfirmation {
  id?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  sourceType: 'local' | 'cloud' | 'supabase';
  sourceLabel: string;
  bucketOrTable?: string;
  localFile?: File;
  remoteItem?: RemoteStorageItem;
  onConfirmed?: (docId: string) => void;
}

export interface ByokConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  llmProvider: 'gemini' | 'openai';
  llmApiKey: string;
  preferredExtractionMode?: 'ai' | 'local';
  detectedProviderName?: string;
  isLiveConnected: boolean;
  isSupabaseConnected?: boolean;
  sandboxMode: boolean;
  cloudStorage?: CloudStorageConfig;
}
