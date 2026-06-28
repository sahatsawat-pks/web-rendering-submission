import { NextRequest, NextResponse } from 'next/server';
import { debugSheetTabs } from '@/lib/sheets';
import { getCanonicalSubjectCodeOrDefault } from '@/lib/subjectConfig';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subject = getCanonicalSubjectCodeOrDefault(searchParams.get('subject')) || undefined;

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    // Capture console output
    let output = '';
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args: any[]) => {
      output += args.join(' ') + '\n';
      originalLog(...args);
    };
    
    console.error = (...args: any[]) => {
      output += '[ERROR] ' + args.join(' ') + '\n';
      originalError(...args);
    };
    
    await debugSheetTabs(subject);
    
    console.log = originalLog;
    console.error = originalError;

    return NextResponse.json({
      success: true,
      subject,
      debug_output: output
    });

  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Debug failed' },
      { status: 500 }
    );
  }
}
