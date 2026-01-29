import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { getAllLabs } from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const subject = url.searchParams.get("subject") || undefined

    // Get all labs with quiz information
    const labs = await getAllLabs(false, subject)
    
    // Transform labs to quiz format
    const result = { rows: labs.map(lab => ({
      id: lab.id,
      lab_number: lab.labNumber,
      title: lab.title,
      subject: lab.subject,
      quiz_enabled: lab.quizEnabled,
      quiz_questions: lab.quizQuestions,
      quiz_categories: lab.quizCategories,
      quiz_time_limit: lab.quizTimeLimit,
      quiz_time_limit_enabled: lab.quizTimeLimitEnabled,
      is_active: lab.isActive
    }))}

    const quizzes = result.rows.map(row => ({
      id: row.id,
      labNumber: row.lab_number,
      title: row.title,
      subject: row.subject,
      quizEnabled: row.quiz_enabled || false,
      hasQuestions: !!row.quiz_questions,
      questionCount: row.quiz_questions ? JSON.parse(row.quiz_questions).length : 0,
      hasCategories: !!row.quiz_categories,
      timeLimit: row.quiz_time_limit || 0,
      timeLimitEnabled: row.quiz_time_limit_enabled || false,
      isActive: row.is_active
    }))

    return NextResponse.json({ quizzes })
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

    // Import Pool here to update quiz enabled status
    const { Pool } = await import('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })

    // Toggle quiz enabled status
    const result = await pool.query(
      `UPDATE labs 
       SET quiz_enabled = $1 
       WHERE id = $2 
       RETURNING id, quiz_enabled`,
      [quizEnabled, labId]
    )

    await pool.end()

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      labId: result.rows[0].id,
      quizEnabled: result.rows[0].quiz_enabled
    })
  } catch (error) {
    console.error("Error toggling quiz:", error)
    return NextResponse.json(
      { error: "Failed to toggle quiz" },
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

    // Import Pool here to clear quiz data
    const { Pool } = await import('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })

    // Clear quiz data from lab
    const result = await pool.query(
      `UPDATE labs 
       SET quiz_questions = NULL, 
           quiz_categories = NULL, 
           quiz_enabled = FALSE,
           quiz_time_limit = 0,
           quiz_time_limit_enabled = FALSE
       WHERE id = $1 
       RETURNING id`,
      [labId]
    )

    await pool.end()

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      labId: result.rows[0].id
    })
  } catch (error) {
    console.error("Error removing quiz:", error)
    return NextResponse.json(
      { error: "Failed to remove quiz" },
      { status: 500 }
    )
  }
}
