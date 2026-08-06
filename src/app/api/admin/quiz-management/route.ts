import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { getAllLabs, getSubjects } from "@/lib/db"
import { getCanonicalSubjectCodeOrDefault } from '@/lib/subjectConfig'
import { normalizeQuizPayload } from '@/lib/quizSetAdapter'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const subject = getCanonicalSubjectCodeOrDefault(url.searchParams.get("subject")) || undefined

    // Get all labs with quiz information
    const allLabs = await getAllLabs(false, subject)
    const labs = allLabs.filter(lab => lab.labType !== 'Challenge')
    
    // Get all subjects dynamically from database
    const allSubjects = await getSubjects()
    const subjectCodes = Array.from(new Set(allSubjects.map(s => s.code.toUpperCase())))
    
    const quizzes = labs.map(lab => {
      const { questions } = normalizeQuizPayload(lab.quizQuestions)
      let hasCat = false
      try {
        const cat = lab.quizCategories ? JSON.parse(lab.quizCategories) : []
        hasCat = cat.length > 0
      } catch {
        hasCat = false
      }

      return {
        id: lab.id,
        labNumber: lab.labNumber,
        title: lab.title,
        subject: lab.subject.toUpperCase(),
        quizEnabled: lab.quizEnabled || false,
        hasQuestions: questions.length > 0,
        questionCount: questions.length,
        hasCategories: hasCat,
        timeLimit: lab.quizTimeLimit || 0,
        timeLimitEnabled: lab.quizTimeLimitEnabled || false,
        isActive: lab.isActive
      }
    })

    return NextResponse.json({ quizzes, subjects: subjectCodes })
  } catch (error) {
    console.error("Error fetching quizzes:", error)
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { labId, quizEnabled } = await req.json()

    if (!labId) {
      return NextResponse.json({ error: "Lab ID is required" }, { status: 400 })
    }

    const { updateLab } = await import("@/lib/db")
    await updateLab(labId, { quizEnabled })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating quiz:", error)
    return NextResponse.json(
      { error: "Failed to update quiz" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const labId = url.searchParams.get("labId")

    if (!labId) {
      return NextResponse.json({ error: "Lab ID is required" }, { status: 400 })
    }

    const { updateLab } = await import("@/lib/db")
    await updateLab(labId, {
      quizEnabled: false,
      quizQuestions: undefined,
      quizCategories: undefined
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing quiz:", error)
    return NextResponse.json(
      { error: "Failed to remove quiz" },
      { status: 500 }
    )
  }
}
