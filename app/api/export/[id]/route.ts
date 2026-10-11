import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/supabase/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const docId = resolvedParams.id;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json';

  const doc = dataStore.getDocumentById(docId);
  const fields = dataStore.getExtractedFields(docId);
  const logs = dataStore.getAuditLogs(docId);

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  if (format === 'csv') {
    const headers = 'FieldKey,Label,Value,Confidence,Status,Page\n';
    const rows = fields
      .map(
        (f) =>
          `"${f.field_key}","${f.label}","${f.field_value.replace(/"/g, '""')}",${f.confidence},${f.status},${f.page_number}`
      )
      .join('\n');

    return new NextResponse(headers + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${doc.file_name}-audit.csv"`,
      },
    });
  }

  // Standard JSON-LD / ERP Reconciled Output
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'FinancialDocumentReconciliation',
    documentId: doc.id,
    fileName: doc.file_name,
    vendor: doc.vendor_name,
    auditStatus: doc.status,
    verifiedAccuracyRate: doc.accuracy_rate,
    attestationTimestamp: new Date().toISOString(),
    reconciledFields: fields.reduce((acc, f) => {
      acc[f.field_key] = {
        value: f.field_value,
        confidence: f.confidence,
        status: f.status,
        normalized: f.normalized_value,
      };
      return acc;
    }, {} as Record<string, unknown>),
    auditTrail: logs,
  };

  return NextResponse.json(payload);
}
