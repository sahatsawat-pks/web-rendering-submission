import { NextRequest, NextResponse } from 'next/server';
import { getQuizProgress, saveQuizProgress, deleteQuizProgress } from '@/lib/db';
import { getCanonicalSubjectCodeOrDefault } from '@/lib/subjectConfig';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const subject = getCanonicalSubjectCodeOrDefault(searchParams.get('subject')) || undefined;
    const labNumber = searchParams.get('labNumber');

    if (!studentId || !subject || !labNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    console.log(`[Quiz Progress] Loading progress for ${studentId} - ${subject} Lab ${labNumber}`);

    const progress = await getQuizProgress(studentId, subject, labNumber);

    if (!progress) {
      console.log(`[Quiz Progress] No saved progress found`);
      return NextResponse.json({ 
        success: true, 
        answers: {} 
      });
    }

    console.log(`[Quiz Progress] Found saved progress with ${Object.keys(progress.answers).length} answers`);

    return NextResponse.json({ 
      success: true, 
      answers: progress.answers 
    });

  } catch (error: any) {
    console.error('[Quiz Progress] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, subject: rawSubject, labNumber, answers } = body;
    const subject = getCanonicalSubjectCodeOrDefault(rawSubject);

    if (!studentId || !subject || !labNumber || !answers) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    console.log(`[Quiz Progress] Saving progress for ${studentId} - ${subject} Lab ${labNumber} (${Object.keys(answers).length} answers)`);

    await saveQuizProgress(studentId, subject, labNumber, answers);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Quiz Progress] POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const subject = getCanonicalSubjectCodeOrDefault(searchParams.get('subject')) || undefined;
    const labNumber = searchParams.get('labNumber');

    if (!studentId || !subject || !labNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    console.log(`[Quiz Progress] Deleting progress for ${studentId} - ${subject} Lab ${labNumber}`);

    const deleted = await deleteQuizProgress(studentId, subject, labNumber);

    return NextResponse.json({ success: deleted });

  } catch (error: any) {
    console.error('[Quiz Progress] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
