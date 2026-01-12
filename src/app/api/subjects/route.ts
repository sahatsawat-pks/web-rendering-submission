import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSubjects, updateSubjectVisibility, updateSubjectOrder, createSubject } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    const subjects = await getSubjects();
    
    // Filter by code if provided
    const filteredSubjects = code 
      ? subjects.filter(s => s.code === code)
      : subjects;
    
    // Map title to name for frontend compatibility
    const mappedSubjects = filteredSubjects.map(s => ({
      ...s,
      name: s.title,
      is_visible: s.isVisible,
      display_order: s.displayOrder
    }));
    
    return NextResponse.json({ success: true, subjects: mappedSubjects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    // Only main admin can create subjects
    if (!user || user.username !== 'kanzaki_aito') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { code, title, description, icon, color, isVisible, displayOrder, 
            createScoreCheckPlaceholder, createLabRunnerPlaceholder, courseSummaryLink } = body;

    if (!code || !title) {
      return NextResponse.json({ error: "Code and title are required" }, { status: 400 });
    }

    // Validate code format
    if (!/^[A-Z0-9]+$/.test(code)) {
      return NextResponse.json({ error: "Subject code must contain only uppercase letters and numbers" }, { status: 400 });
    }

    const subject = await createSubject(
      code,
      title,
      description || '',
      icon || 'Code',
      color || 'from-blue-500 to-indigo-500',
      isVisible !== undefined ? isVisible : true,
      displayOrder || 0,
      createScoreCheckPlaceholder || false,
      createLabRunnerPlaceholder || false,
      courseSummaryLink || undefined
    );

    return NextResponse.json({ 
      success: true, 
      message: "Subject created successfully",
      subject 
    });
  } catch (error: any) {
    // Check for unique constraint violation
    if (error.message?.includes('duplicate key') || error.code === '23505') {
      return NextResponse.json({ error: "Subject code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    // Only main admin can manage subjects
    if (!user || user.username !== 'kanzaki_aito') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { code, isVisible, displayOrder } = body;

    if (!code) {
      return NextResponse.json({ error: "Subject code is required" }, { status: 400 });
    }

    if (isVisible !== undefined) {
      await updateSubjectVisibility(code, isVisible);
    }

    if (displayOrder !== undefined) {
      await updateSubjectOrder(code, displayOrder);
    }

    return NextResponse.json({ success: true, message: "Subject updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
