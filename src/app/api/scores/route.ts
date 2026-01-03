import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getAllScores,
  getStudentAllScores,
  updateStudentLabScore,
  batchUpdateScores,
} from "@/lib/sheets";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    // Check if user is admin
    // In this architecture, all authenticated users are admins
    
    const searchParams = request.nextUrl.searchParams;
    const targetUsername = searchParams.get('username');
    const subject = searchParams.get('subject') || undefined;

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
    const { action, username, labNumber, score, feedback, updates, subject } = body;

    if (action === 'update') {
        await updateStudentLabScore(username, labNumber, score, feedback, subject);
    } else if (action === 'batch') {
        await batchUpdateScores(updates); // updates arr should contain subject if mixed, or we pass global subject
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
