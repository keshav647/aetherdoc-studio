import { CloudStorageProviderId } from '@/lib/extraction/types';

export interface CloudProviderBrandMeta {
  id: CloudStorageProviderId;
  name: string;
  shortLabel: string;
  tagline: string;
  brandHex: string;
  defaultRegion: string;
  endpointPlaceholder: string;
}

/**
 * Official Cloud Object Storage Provider Brand Definitions & Themes
 */
export const CLOUD_STORAGE_PROVIDER_BRANDS: Record<
  CloudStorageProviderId,
  CloudProviderBrandMeta
> = {
  cloudflare_r2: {
    id: 'cloudflare_r2',
    name: 'Cloudflare R2',
    shortLabel: 'Cloudflare R2',
    tagline: 'Zero-egress S3-compatible global edge storage',
    brandHex: '#F38020',
    defaultRegion: 'auto',
    endpointPlaceholder: 'https://<account_id>.r2.cloudflarestorage.com',
  },
  aws_s3: {
    id: 'aws_s3',
    name: 'Amazon S3',
    shortLabel: 'AWS S3',
    tagline: 'Enterprise AWS S3 buckets with IAM SigV4 auth',
    brandHex: '#FF9900',
    defaultRegion: 'us-east-1',
    endpointPlaceholder: 'https://s3.us-east-1.amazonaws.com',
  },
  azure_blob: {
    id: 'azure_blob',
    name: 'Azure Blob Storage',
    shortLabel: 'Azure Blob',
    tagline: 'Microsoft Azure containers via SAS or public URL',
    brandHex: '#0078D4',
    defaultRegion: 'eastus',
    endpointPlaceholder: 'https://<account>.blob.core.windows.net',
  },
  gcs: {
    id: 'gcs',
    name: 'Google Cloud Storage',
    shortLabel: 'Google GCS',
    tagline: 'Google Cloud buckets via S3 HMAC interoperability',
    brandHex: '#4285F4',
    defaultRegion: 'us-central1',
    endpointPlaceholder: 'https://storage.googleapis.com',
  },
  custom_s3: {
    id: 'custom_s3',
    name: 'Custom S3 (MinIO / DO)',
    shortLabel: 'Custom S3',
    tagline: 'MinIO, DigitalOcean Spaces, Backblaze B2, Wasabi',
    brandHex: '#8B5CF6',
    defaultRegion: 'us-east-1',
    endpointPlaceholder: 'https://nyc3.digitaloceanspaces.com',
  },
};

export function getCloudProviderLabel(provider: CloudStorageProviderId): string {
  return CLOUD_STORAGE_PROVIDER_BRANDS[provider]?.name || 'S3 Object Storage';
}

export function inferMimeFromKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'text/plain';
}

export function buildS3EndpointUrl(params: {
  provider: CloudStorageProviderId;
  endpointUrl?: string;
  accountId?: string;
  bucketName: string;
  region?: string;
  objectKey?: string;
}): URL {
  const {
    provider,
    endpointUrl,
    accountId,
    bucketName,
    region = 'auto',
    objectKey,
  } = params;
  let base = (endpointUrl || '').trim().replace(/\/+$/, '');

  if (!base) {
    if (provider === 'cloudflare_r2' && accountId) {
      base = `https://${accountId.trim()}.r2.cloudflarestorage.com`;
    } else if (provider === 'aws_s3') {
      const awsRegion = region === 'auto' ? 'us-east-1' : region;
      base = `https://s3.${awsRegion}.amazonaws.com`;
    } else if (provider === 'gcs') {
      base = 'https://storage.googleapis.com';
    } else {
      base = 'https://s3.amazonaws.com';
    }
  }

  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = `https://${base}`;
  }

  const cleanBucket = bucketName.trim().replace(/^\/+|\/+$/g, '');
  const encodedKey = objectKey
    ? '/' +
      objectKey
        .split('/')
        .map((seg) => encodeURIComponent(seg))
        .join('/')
    : '';

  const fullUrl = base.endsWith(`/${cleanBucket}`)
    ? `${base}${encodedKey}`
    : `${base}/${cleanBucket}${encodedKey}`;

  return new URL(fullUrl);
}
