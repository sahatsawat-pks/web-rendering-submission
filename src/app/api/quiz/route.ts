import { NextRequest, NextResponse } from 'next/server'
import { getAllLabs, updateLab, getLabByNumber, Lab } from '@/lib/db'
import { getCanonicalSubjectCodeOrDefault } from '@/lib/subjectConfig'
import { normalizeQuizPayload } from '@/lib/quizSetAdapter'
import { calculateQuizLabStats } from '@/lib/quizStats'

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
  const setId = searchParams.get('setId') || undefined

  if (!subject) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400, headers: noCacheHeaders })
  }

  try {
    if (action === 'stats' && labNumber) {
      const stats = await calculateQuizLabStats(subject, labNumber, setId)
      return NextResponse.json({
        success: true,
        stats
      }, { headers: noCacheHeaders })
    }

    if (action === 'settings') {
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
      const lab = await getLabByNumber(labNumber, subject)
      
      if (!lab) {
        return NextResponse.json({ error: 'Lab not found' }, { status: 404, headers: noCacheHeaders })
      }

      const { sets, activeSetId, questions } = normalizeQuizPayload(lab.quizQuestions)
      let categories = []
      
      try {
        categories = lab.quizCategories ? JSON.parse(lab.quizCategories) : []
      } catch {
        categories = []
      }

      return NextResponse.json({
        success: true,
        questions,
        sets,
        activeSetId,
        categories,
        quizEnabled: lab.quizEnabled ?? false,
        quizTimeLimit: lab.quizTimeLimit ?? 0,
        quizTimeLimitEnabled: lab.quizTimeLimitEnabled ?? false,
        quizShuffleChoices: lab.quizShuffleChoices ?? false,
        quizShuffleQuestions: lab.quizShuffleQuestions ?? false,
        labTitle: lab.title
      }, { headers: noCacheHeaders })
    }

    // Get all labs with quiz for subject
    const labs = await getAllLabs(false, subject)
    const subjectLabs = labs.filter((lab: Lab) => lab.quizEnabled !== false && lab.labType !== 'Challenge')

    const labsWithQuiz = subjectLabs.map((lab: Lab) => {
      const { questions, sets, activeSetId } = normalizeQuizPayload(lab.quizQuestions)

      return {
        id: lab.id,
        labNumber: lab.labNumber,
        title: lab.title,
        questionCount: questions.length,
        setCount: sets.length,
        activeSetId,
        quizEnabled: lab.quizEnabled ?? true,
        quizShuffleChoices: lab.quizShuffleChoices ?? false,
        quizShuffleQuestions: lab.quizShuffleQuestions ?? false
      }
    })

    return NextResponse.json({
      success: true,
      labs: labsWithQuiz
    }, { headers: noCacheHeaders })
  } catch (error: any) {
    console.error('Error fetching quiz data:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch quiz data' }, { status: 500, headers: noCacheHeaders })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, subject: rawSubject, labNumber, questions, sets, activeSetId, categories, quizEnabled, quizTimeLimit, quizTimeLimitEnabled, quizShuffleChoices, quizShuffleQuestions } = body
    const subject = getCanonicalSubjectCodeOrDefault(rawSubject)

    if (!subject || !labNumber) {
      return NextResponse.json({ error: 'Subject and lab number are required' }, { status: 400 })
    }

    const lab = await getLabByNumber(labNumber, subject)

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404, headers: noCacheHeaders })
    }

    if (action === 'update_questions') {
      let payloadToSave: string

      if (sets && Array.isArray(sets)) {
        payloadToSave = JSON.stringify({
          sets,
          activeSetId: activeSetId || sets[0]?.id || 'set_1'
        })
      } else {
        payloadToSave = JSON.stringify(questions || [])
      }

      await updateLab(lab.id, {
        quizQuestions: payloadToSave,
        quizCategories: JSON.stringify(categories || [])
      })

      return NextResponse.json({
        success: true,
        message: 'Questions updated successfully'
      })
    }

    if (action === 'update_settings') {
      await updateLab(lab.id, {
        quizEnabled,
        quizTimeLimit,
        quizTimeLimitEnabled,
        quizShuffleChoices,
        quizShuffleQuestions
      })

      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating quiz data:', error)
    return NextResponse.json({ error: error.message || 'Failed to update quiz data' }, { status: 500, headers: noCacheHeaders })
  }
}
