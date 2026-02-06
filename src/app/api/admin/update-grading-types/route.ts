import { NextResponse } from 'next/server'
import { getSubjects, updateSubject, getAllLabs, updateLab } from '@/lib/db'

export async function POST() {
  try {
    // Get all subjects
    const subjects = await getSubjects()
    
    const updates = []
    
    // Update all subjects except ITCS113 to simple_score
    for (const subject of subjects) {
      if (subject.code !== 'ITCS113' && subject.hasGradingInterface) {
        await updateSubject(subject.code, {
          gradingType: 'simple_score'
        })
        updates.push({
          code: subject.code,
          oldType: subject.gradingType,
          newType: 'simple_score'
        })
        
        // Clear subQuestions for all labs in this subject
        const labs = await getAllLabs(false, subject.code)
        for (const lab of labs) {
          if (lab.subQuestions) {
            await updateLab(lab.id, {
              subQuestions: undefined
            })
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} subjects to simple_score and cleared subQuestions`,
      updates
    })
  } catch (error: any) {
    console.error('Error updating grading types:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const subjects = await getSubjects()
    
    const gradingTypes = subjects
      .filter(s => s.hasGradingInterface)
      .map(s => ({
        code: s.code,
        gradingType: s.gradingType
      }))
    
    return NextResponse.json({
      success: true,
      subjects: gradingTypes
    })
  } catch (error: any) {
    console.error('Error fetching grading types:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
