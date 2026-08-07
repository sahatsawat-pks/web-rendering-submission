import { NextRequest, NextResponse } from 'next/server'
import { getQuizScores, saveQuizScore } from '@/lib/db'
import { getCanonicalSubjectCodeOrDefault } from '@/lib/subjectConfig'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
}

// GET - Get quiz scores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subject = getCanonicalSubjectCodeOrDefault(searchParams.get('subject')) || undefined
    const labNumber = searchParams.get('labNumber') || undefined
    const studentId = searchParams.get('studentId') || undefined

    const scores = await getQuizScores(subject, labNumber, studentId)

    return NextResponse.json({ success: true, scores }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('Error fetching quiz scores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quiz scores' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}

// POST - Save quiz score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentId,
      subject: rawSubject,
      labNumber,
      score,
      totalQuestions,
      correctAnswers,
      answers
    } = body
    const subject = getCanonicalSubjectCodeOrDefault(rawSubject)

    // Validation
    if (!studentId || !subject || !labNumber || score === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: noCacheHeaders }
      )
    }

    const newScore = await saveQuizScore(
      studentId,
      subject,
      labNumber,
      score,
      totalQuestions,
      correctAnswers,
      answers
    )

    return NextResponse.json({ 
      success: true, 
      message: 'Quiz score saved successfully',
      scoreId: newScore.id 
    }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('Error saving quiz score:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save quiz score' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}

// DELETE - Clear quiz scores for a lab or whole subject
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subject = getCanonicalSubjectCodeOrDefault(searchParams.get('subject')) || undefined
    const labNumber = searchParams.get('labNumber') || undefined

    if (!subject) {
      return NextResponse.json(
        { success: false, error: 'Subject is required' },
        { status: 400, headers: noCacheHeaders }
      )
    }

    // Dynamic import to avoid circular dependency issues if any
    const { deleteQuizScores } = await import('@/lib/db')
    const count = await deleteQuizScores(subject, labNumber)

    return NextResponse.json({ 
      success: true, 
      message: `Cleared ${count} quiz scores`,
      count 
    }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('Error clearing quiz scores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear quiz scores' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
