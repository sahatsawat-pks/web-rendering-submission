import { NextResponse } from "next/server"
import { updateSubjectQuizSection } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { subjectCode, enabled } = await req.json()
    
    console.log('📝 Toggle request:', { subjectCode, enabled })

    if (!subjectCode || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: "Invalid parameters" },
        { status: 400 }
      )
    }

    const quizSectionEnabled = await updateSubjectQuizSection(subjectCode, enabled)
    
    console.log('✅ Updated quiz section:', { subjectCode, quizSectionEnabled })

    return NextResponse.json({
      success: true,
      quizSectionEnabled
    })
  } catch (error) {
    console.error("❌ Error toggling quiz section:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
