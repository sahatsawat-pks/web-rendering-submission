import { NextRequest, NextResponse } from "next/server";
import { getITCS113Student } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('id');
    
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    // First, check ITCS113_Student table
    const itcs113Student = await getITCS113Student(studentId);

    if (itcs113Student) {
      return NextResponse.json({
        success: true,
        students: [{
          id: itcs113Student.studentId,
          studentId: itcs113Student.studentId,
          name: itcs113Student.name,
          surname: itcs113Student.surname,
          section: itcs113Student.section || ''
        }]
      });
    }

    // If not found in ITCS113, search across all subjects via Google Sheets
    // Try fetching from scores API with list_all for each subject
    const subjects = ['ITCS251', 'ITCS255', 'ITCS258', 'ITCS283', 'ITDS283', 'ITDS382', 'ITDS317', 'ITCS362'];
    
    for (const subject of subjects) {
      try {
        const apiUrl = request.url.split('/api')[0];
        const response = await fetch(`${apiUrl}/api/scores?subject=${subject}&action=list_all`, {
          headers: request.headers
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.students) {
            const student = data.students.find((s: any) => 
              s.id === studentId || s.studentId === studentId
            );
            
            if (student) {
              return NextResponse.json({
                success: true,
                students: [{
                  id: student.id || student.studentId,
                  studentId: student.id || student.studentId,
                  name: student.name || '',
                  surname: student.surname || '',
                  section: student.section || ''
                }]
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching from ${subject}:`, error);
      }
    }

    // Student not found in any subject
    return NextResponse.json({
      success: false,
      students: []
    });
    
  } catch (error: any) {
    console.error('Error in students API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
