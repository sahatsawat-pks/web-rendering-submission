import { NextResponse } from 'next/server';
import { getAllScores, clearSheetsCache, clearSubjectsCache } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    // Fetch all student data from Google Sheets
    let students = await getAllScores(subject);

    // If no students found, clear cache and try once more (for new subjects)
    if (!students || students.length === 0) {
      clearSheetsCache(subject);
      clearSubjectsCache();
      students = await getAllScores(subject);
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ prefixes: [] });
    }

    // Extract first 4 digits from student IDs
    const prefixSet = new Set<string>();
    
    students.forEach((student: any) => {
      if (student.username) {
        const id = String(student.username).trim();
        if (id.length >= 4) {
          const prefix = id.substring(0, 4);
          // Only add if it's numeric
          if (/^\d{4}$/.test(prefix)) {
            prefixSet.add(prefix);
          }
        }
      }
    });

    // Convert to sorted array
    const prefixes = Array.from(prefixSet).sort();

    return NextResponse.json({ 
      success: true, 
      prefixes,
      count: prefixes.length
    });

  } catch (error: any) {
    console.error('Error fetching student prefixes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch student prefixes' },
      { status: 500 }
    );
  }
}
