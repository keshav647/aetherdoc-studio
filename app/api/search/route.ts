import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  const results = dataStore.searchHybrid(q);

  return NextResponse.json({
    query: q,
    count: results.documents.length + results.matchedFields.length + results.chunks.length,
    results,
  });
}
