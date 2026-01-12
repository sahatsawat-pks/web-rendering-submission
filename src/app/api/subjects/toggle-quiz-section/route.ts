import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { subjectCode, enabled } = await req.json()

    if (!subjectCode || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: "Invalid parameters" },
        { status: 400 }
      )
    }

    const pool = getPool()
    const result = await pool.query(
      `UPDATE subjects 
       SET quiz_section_enabled = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE code = $2 
       RETURNING quiz_section_enabled`,
      [enabled, subjectCode]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Subject not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      quizSectionEnabled: result.rows[0].quiz_section_enabled
    })
  } catch (error) {
    console.error("Error toggling quiz section:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
