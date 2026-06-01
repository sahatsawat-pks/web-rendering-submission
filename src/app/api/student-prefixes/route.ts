import { NextResponse } from 'next/server';
import { getStudentIdPrefixes, clearSheetsCache, clearSubjectsCache } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const bypassCache = searchParams.get('bypassCache') === 'true';

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    let prefixes = await getStudentIdPrefixes(subject, bypassCache);

    // Retry once if empty (e.g. new subject) — single lightweight fetch
    if (prefixes.length === 0 && !bypassCache) {
      clearSheetsCache(subject);
      clearSubjectsCache();
      prefixes = await getStudentIdPrefixes(subject, true);
    }

    return NextResponse.json({
      success: true,
      prefixes,
      count: prefixes.length,
    });
  } catch (error: any) {
    console.error('Error fetching student prefixes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch student prefixes' },
      { status: 500 }
    );
  }
}
