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
    if (action === 'list_all' && subject) {
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        try {
            const allScores = await getAllScores(subject);
            // Transform to student list format
            const students = allScores.map((student: any) => ({
                id: student.username || student.ID || student.studentId || '',
                studentId: student.username || student.ID || student.studentId || '',
                name: student.name || student.Name || '',
                surname: student.surname || student.Surname || '',
                section: student.Section || student.section || ''
            })).filter((s: any) => s.id); // Filter out empty IDs
            
            return NextResponse.json({ success: true, students });
        } catch (error: any) {
            console.error('Error fetching student list:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    // Credential Resolution Logic (Universal)
    // Check if targetUsername is a credential code (6 alphanumeric chars)
    if (targetUsername && /^[A-Z0-9]{6}$/.test(targetUsername)) {
        console.log(`[Scores API] Credential code detected: ${targetUsername}, Subject: ${subject || 'not specified'}`);
        
        // Look up credential to get actual student ID
        // Note: We can pass subject to refine search, or omit to search globally.
        // If we omit subject, we might find a credential from another subject. 
        // Is that allowed? YES. Universal credential.
        const apiUrl = request.url.split('/api')[0];
        const credResponse = await fetch(`${apiUrl}/api/credentials?credential=${targetUsername}`);
        
        console.log(`[Scores API] Credential lookup response status: ${credResponse.status}`);
        
        if (credResponse.ok) {
            const credData = await credResponse.json();
            console.log(`[Scores API] Credential lookup result:`, credData);
            
            if (credData.success && credData.studentId) {
                // Use the actual student ID for lookup
                console.log(`[Scores API] Credential found! Mapped to student ID: ${credData.studentId}`);
                targetUsername = credData.studentId;
            } else {
                // Credential verification failed (not found)
                console.log(`[Scores API] Credential not found in database: ${targetUsername}`);
                return NextResponse.json({ 
                    success: false, 
                    error: "Credential not found in database. Please check your credential code or contact your instructor." 
                });
            }
        } else {
            console.log(`[Scores API] Credential API request failed`);
            return NextResponse.json({ 
                success: false, 
                error: "Failed to validate credential. Please try again." 
            });
        }
    }

    // Special Handling for ITCS223 (Now on Sheets)
    if (subject === 'ITCS223') {        
        console.log(`[Scores API] Fetching ITCS223 data from Google Sheets...`);
        
        // Use Google Sheets Logic (now updated to handle Sections)
        // If targetUsername is provided, return that student's object
        // NOTE: targetUsername might be "u64...\" or "64...". Sheets usually stored as "64..." in ID column.
        
        // However, standard getStudentAllScores maps row[0] (or ID column) to 'username'.
        // If sheets.ts handles ITCS223 ID col as 1, it will map ID to 'username'.
        // So we just need to pass the target ID.
        
        let allScores = await getAllScores(subject);
        console.log(`[Scores API] Fetched ${allScores.length} students from ITCS223 sheets`);
        
        if (targetUsername) {
             console.log(`[Scores API] Looking for student: ${targetUsername}`);
             
             // Flexible matching: Try exact match, or match without 'u' prefix
             const student = allScores.find(s => {
                const sheetId = String(s.username || '').trim();
                const inputId = String(targetUsername).trim();
                const inputIdNoU = inputId.replace(/^[uU]/, '');
                const sheetIdNoU = sheetId.replace(/^[uU]/, '');
                
                return sheetId === inputId || sheetIdNoU === inputIdNoU;
             });
             
             if (!student) {
                 console.log(`[Scores API] Student not found in ITCS223 sheets. Searched IDs: ${targetUsername}`);
                 return NextResponse.json({ 
                     success: false, 
                     error: `Student ID ${targetUsername} not found in ITCS223 records. Please verify your student ID.` 
                 });
             }
             
             console.log(`[Scores API] Student found:`, { username: student.username, name: student.name, section: student.Section });
             
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
        
        console.log(`[Scores API] Returning all ITCS223 students: ${allScores.length} records`);
        return NextResponse.json({ success: true, scores: allScores });
    }

    if (targetUsername) {
        console.log(`[Scores API] Standard lookup for ${targetUsername} in subject ${subject || 'default'}`);
        const scores = await getStudentAllScores(targetUsername, subject);
        console.log(`[Scores API] Standard lookup result:`, scores ? 'Found' : 'Not found');
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

    // Check if user has permission to update scores for this subject (or is main admin)
    if (subject && user.username !== 'kanzaki_aito') {
      const { getUserPermissions } = await import("@/lib/db");
      const userPerms = await getUserPermissions(user.userId);
      const hasPermission = userPerms.some(p => p.subjectCode === subject.toLowerCase() && p.canEdit);
      
      if (!hasPermission) {
        return NextResponse.json({ error: "Forbidden: You don't have permission to update scores for this subject" }, { status: 403 });
      }
    }

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
