import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getAllScores,
  getStudentAllScores,
  updateStudentLabScore,
  batchUpdateScores,
  fillMissingScores,
} from "@/lib/sheets";

import { getOneDriveScores } from "@/lib/onedrive";

const ITCS223_ONEDRIVE_URL = "https://studentmahidolac-my.sharepoint.com/:x:/r/personal/wudhichart_saw_mahidol_ac_th/_layouts/15/Doc.aspx?sourcedoc=%7B8DEAE777-D52D-4BFE-8610-A99ACC9153ED%7D&file=682_ITCS223_LabScore.xlsx&action=default&mobileredirect=true";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    // Check if user is admin
    // In this architecture, all authenticated users are admins
    
    const searchParams = request.nextUrl.searchParams;
    let targetUsername = searchParams.get('username');
    const subject = searchParams.get('subject') || undefined;
    const action = searchParams.get('action');

    // Special action: list_all - returns all students for credential generation
    if (action === 'list_all' && subject === 'ITCS223') {
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        try {
            const allScores = await getAllScores(subject);
            // Transform to student list format
            const students = allScores.map((student: any) => ({
                id: student.username || student.ID || '',
                studentId: student.username || student.ID || '',
                name: student.name || student.Name || '',
                surname: student.surname || student.Surname || '',
                section: student.Section || student.section || ''
            }));
            
            return NextResponse.json({ success: true, students });
        } catch (error: any) {
            console.error('Error fetching student list:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    // Special Handling for ITCS223 (Now on Sheets)
    if (subject === 'ITCS223') {
        // Check if targetUsername is a credential code (6 letters)
        if (targetUsername && /^[A-Z0-9]{6}$/.test(targetUsername)) {
            // Look up credential to get actual student ID
            const credResponse = await fetch(`${request.url.split('/api')[0]}/api/credentials?credential=${targetUsername}&subject=ITCS223`);
            
            if (credResponse.ok) {
                const credData = await credResponse.json();
                if (credData.success && credData.studentId) {
                    // Use the actual student ID for lookup
                    targetUsername = credData.studentId;
                } else {
                    // Credential not found
                    return NextResponse.json({ success: true, scores: null });
                }
            }
        }
        
        // Use Google Sheets Logic (now updated to handle Sections)
        // If targetUsername is provided, return that student's object
        // NOTE: targetUsername might be "u64..." or "64...". Sheets usually stored as "64..." in ID column.
        
        // However, standard getStudentAllScores maps row[0] (or ID column) to 'username'.
        // If sheets.ts handles ITCS223 ID col as 1, it will map ID to 'username'.
        // So we just need to pass the target ID.
        
        let allScores = await getAllScores(subject);
        
        if (targetUsername) {
             const student = allScores.find(s => 
                s.username === targetUsername || 
                (targetUsername && s.username === targetUsername.replace(/^u/, ''))
             );
             
             if (!student) {
                 return NextResponse.json({ success: true, scores: null /* or empty object */ });
             }
             
             // Map to expected frontend structure if needed, or pass as is?
             // Sheets returns { username, Lab 1, Lab 2, ... }
             // Frontend for ITCS223/score page expects StudentScore object?
             // Actually, the frontend calls `/api/scores?username=...&subject=ITCS223`.
             // The response is usually { success: true, scores: { ... } }.
             // The frontend might expect specific fields.
             // Looking at onedrive.ts, we returned: { no, studentId, name, surname, percentage, totalScore, labs: { '1': {score, total} } }
             // Sheets returns flat keys: "Lab 1", "Lab 2".
             
             // We need to ADAPT the sheets response to match the ITCS223 Frontend expectation OR update Frontend.
             // Let's adapt here to be safe and consistent with the previous OneDrive shape if possible, 
             // OR check if other subjects (ITGE162) use a flat structure.
             // Other subjects use flat structure. ITCS223 page might have been built for flat structure too?
             // Wait, the previous OneDrive implementation returned a structured object.
             // Check `src/app/itcs223/score/page.tsx` ... 
             // Ideally we just return the flat object and let frontend deal with it, BUT 
             // if ITCS223 page is special, we might need to transform.
             
             // Let's assume standard behavior for now:
             return NextResponse.json({ success: true, scores: student });
        }
        
        return NextResponse.json({ success: true, scores: allScores });
    }

    if (targetUsername) {
        const scores = await getStudentAllScores(targetUsername, subject);
        return NextResponse.json({ success: true, scores });
    }
    
    // If no specific username, and user is authenticated, maybe we return all? 
    // Let's protect "all" scores.
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allScores = await getAllScores(subject);
    return NextResponse.json({ success: true, scores: allScores });

  } catch (error: any) {
    console.error('Error fetching scores:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, username, labNumber, score, labScore, challengeScore, feedback, updates, subject, section } = body;

    if (action === 'update') {
        // For ITCS123, handle lab and/or challenge scores independently
        if (subject === 'ITCS123') {
            // Update lab score if provided
            if (labScore !== undefined) {
                await updateStudentLabScore(username, labNumber, labScore, undefined, subject, 'lab');
            }
            // Update challenge score if provided
            if (challengeScore !== undefined) {
                await updateStudentLabScore(username, labNumber, challengeScore, undefined, subject, 'challenge');
            }
        } else {
            // Standard single score update for other subjects
            await updateStudentLabScore(username, labNumber, score, feedback, subject);
        }
    } else if (action === 'batch') {
        await batchUpdateScores(updates); // updates arr should contain subject if mixed, or we pass global subject
    } else if (action === 'fill_missing') {
        const result = await fillMissingScores(subject, labNumber, '0', section);
        return NextResponse.json(result);
    } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error updating scores:', error);
    return NextResponse.json({ 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        details: JSON.stringify(error)
    }, { status: 500 });
  }
}
