import { NextRequest, NextResponse } from 'next/server'
import { getAllLabs, updateLab, getLabByNumber, Lab } from '@/lib/db'
import { getCanonicalSubjectCodeOrDefault } from '@/lib/subjectConfig'

export const dynamic = 'force-dynamic'

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const subject = getCanonicalSubjectCodeOrDefault(searchParams.get('subject')) || undefined
  const labNumber = searchParams.get('labNumber')
  const action = searchParams.get('action')

  if (!subject) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400, headers: noCacheHeaders })
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
      }, { headers: noCacheHeaders })
    }

    if (labNumber) {
      // Get questions for specific lab
      const lab = await getLabByNumber(labNumber, subject)
      
      if (!lab) {
        return NextResponse.json({ error: 'Lab not found' }, { status: 404, headers: noCacheHeaders })
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
      }, { headers: noCacheHeaders })
    }

    // Get all labs with quiz for subject, regardless of active status
    const labs = await getAllLabs(false, subject)
    const subjectLabs = labs.filter((lab: Lab) => lab.quizEnabled === true && lab.labType !== 'Challenge')

    const labsWithQuiz = subjectLabs.map((lab: Lab) => {
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
    }, { headers: noCacheHeaders })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch quiz data' }, { status: 500, headers: noCacheHeaders })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, subject: rawSubject, labNumber, questions, categories, quizEnabled, quizTimeLimit, quizTimeLimitEnabled } = body
    const subject = getCanonicalSubjectCodeOrDefault(rawSubject)

    if (!subject || !labNumber) {
      return NextResponse.json({ error: 'Subject and lab number are required' }, { status: 400 })
    }

    const lab = await getLabByNumber(labNumber, subject)

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404, headers: noCacheHeaders })
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
  } catch {
    return NextResponse.json({ error: 'Failed to update quiz data' }, { status: 500, headers: noCacheHeaders })
  }
}
