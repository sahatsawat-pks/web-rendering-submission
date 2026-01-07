import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSubjects, updateSubjectVisibility, updateSubjectOrder } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const subjects = await getSubjects();
    // Map title to name for frontend compatibility
    const mappedSubjects = subjects.map(s => ({
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
