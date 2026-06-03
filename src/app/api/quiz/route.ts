import { NextRequest, NextResponse } from 'next/server'
import { getAllLabs, updateLab, getLabByNumber } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')?.toUpperCase()
  const labNumber = searchParams.get('labNumber')
  const action = searchParams.get('action')

  if (!subject) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  }

  try {
    if (action === 'settings') {
      // Get quiz settings for subject
      const labs = await getAllLabs(false, subject)
      const firstLab = labs[0]
      
      return NextResponse.json({
        success: true,
        settings: {
          enabled: firstLab?.quizEnabled ?? false,
          timeLimit: firstLab?.quizTimeLimit ?? 0,
          timeLimitEnabled: firstLab?.quizTimeLimitEnabled ?? false
        }
      })
    }

    if (labNumber) {
      // Get questions for specific lab
      const lab = await getLabByNumber(labNumber, subject)
      
      if (!lab) {
        return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
      }

      let questions = []
      let categories = []
      
      try {
        questions = lab.quizQuestions ? JSON.parse(lab.quizQuestions) : []
        categories = lab.quizCategories ? JSON.parse(lab.quizCategories) : []
      } catch {
        questions = []
        categories = []
      }

      return NextResponse.json({
        success: true,
        questions,
        categories,
        quizEnabled: lab.quizEnabled ?? false,
        quizTimeLimit: lab.quizTimeLimit ?? 0,
        quizTimeLimitEnabled: lab.quizTimeLimitEnabled ?? false,
        labTitle: lab.title
      })
    }

    // Get all labs with quiz for subject
    const labs = await getAllLabs(true, subject)
    const subjectLabs = labs.filter((lab: any) => lab.quizEnabled === true && lab.labType !== 'Challenge')

    const labsWithQuiz = subjectLabs.map((lab: any) => {
      let questionCount = 0
      try {
        const questions = lab.quizQuestions ? JSON.parse(lab.quizQuestions) : []
        questionCount = questions.length
      } catch {
        questionCount = 0
      }

      return {
        id: lab.id,
        labNumber: lab.labNumber,
        title: lab.title,
        questionCount,
        quizEnabled: lab.quizEnabled ?? false
      }
    })

    return NextResponse.json({
      success: true,
      labs: labsWithQuiz
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch quiz data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { action, subject, labNumber, questions, categories, quizEnabled, quizTimeLimit, quizTimeLimitEnabled } = body
    subject = subject?.toUpperCase()

    if (!subject || !labNumber) {
      return NextResponse.json({ error: 'Subject and lab number are required' }, { status: 400 })
    }

    const lab = await getLabByNumber(labNumber, subject)

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }

    if (action === 'update_questions') {
      // Update questions and categories
      await updateLab(lab.id, {
        quizQuestions: JSON.stringify(questions || []),
        quizCategories: JSON.stringify(categories || [])
      })

      return NextResponse.json({
        success: true,
        message: 'Questions updated successfully'
      })
    }

    if (action === 'update_settings') {
      // Update quiz settings
      await updateLab(lab.id, {
        quizEnabled,
        quizTimeLimit,
        quizTimeLimitEnabled
      })

      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update quiz data' }, { status: 500 })
  }
}
