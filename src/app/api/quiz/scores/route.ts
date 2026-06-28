import { NextRequest, NextResponse } from 'next/server'
import { getQuizScores, saveQuizScore } from '@/lib/db'
import { getCanonicalSubjectCodeOrDefault } from '@/lib/subjectConfig'
export const dynamic = 'force-dynamic'

// GET - Get quiz scores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subject = getCanonicalSubjectCodeOrDefault(searchParams.get('subject')) || undefined
    const labNumber = searchParams.get('labNumber') || undefined
    const studentId = searchParams.get('studentId') || undefined

    const scores = await getQuizScores(subject, labNumber, studentId)

    return NextResponse.json({ success: true, scores })
  } catch (error) {
    console.error('Error fetching quiz scores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quiz scores' },
      { status: 500 }
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
        { status: 400 }
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
    })
  } catch (error) {
    console.error('Error saving quiz score:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save quiz score' },
      { status: 500 }
    )
  }
}

// DELETE - Clear quiz scores for a lab
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subject = getCanonicalSubjectCodeOrDefault(searchParams.get('subject')) || undefined
    const labNumber = searchParams.get('labNumber')

    if (!subject || !labNumber) {
      return NextResponse.json(
        { success: false, error: 'Subject and Lab Number are required' },
        { status: 400 }
      )
    }

    // Dynamic import to avoid circular dependency issues if any
    const { deleteQuizScores } = await import('@/lib/db')
    const count = await deleteQuizScores(subject, labNumber)

    return NextResponse.json({ 
      success: true, 
      message: `Cleared ${count} quiz scores`,
      count 
    })
  } catch (error) {
    console.error('Error clearing quiz scores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear quiz scores' },
      { status: 500 }
    )
  }
}
