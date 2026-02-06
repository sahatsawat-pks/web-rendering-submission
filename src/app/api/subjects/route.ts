import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

// Performance optimization: Cache this API route
export const revalidate = 3600; // Revalidate every hour
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
      display_order: s.displayOrder,
      column_pattern: s.columnPattern,
      google_sheet_id: s.googleSheetId
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
    const { 
      code, title, description, icon, color, isVisible, displayOrder, 
      courseSummaryLink,
      editingSubject,
      googleSheetId,
      // Dynamic routing configuration
      hasGradingInterface,
      hasQuizManagement,
      hasTestCases,
      gradingType,
      headerRow,
      columnPattern,
      dataSourceType,
      sheetTabs,
      // Grading configuration
      labWeight,
      labMaxScore
    } = body;

    if (!code || !title) {
      return NextResponse.json({ error: "Code and title are required" }, { status: 400 });
    }

    // Validate code format
    if (!/^[A-Z0-9]+$/.test(code)) {
      return NextResponse.json({ error: "Subject code must contain only uppercase letters and numbers" }, { status: 400 });
    }

    // Import db dynamically to avoid circular deps if any (standard pattern in this codebase)
    const { createSubject, updateSubject } = await import("@/lib/db");

    // Create subject
    // We need to update createSubject signature in db.ts or use update after create if createSubject doesn't support all fields yet.
    // Looking at db.ts, createSubject supports most fields but NOT the new dynamic flags yet.
    // Strategy: Create with basic fields, then immediately Update with new flags.

    const subject = await createSubject(
      code,
      title,
      description || '',
      icon || 'Code',
      color || 'from-blue-500 to-indigo-500',
      isVisible !== undefined ? isVisible : true,
      displayOrder || 0,
      false, // createScoreCheckPlaceholder - deprecated
      false, // createLabRunnerPlaceholder - deprecated
      courseSummaryLink || undefined
    );

    // Apply extended configuration
    if (subject) {
      await updateSubject(code, {
        hasGradingInterface: hasGradingInterface || false,
        hasQuizManagement: hasQuizManagement || false,
        hasTestCases: hasTestCases || false,
        gradingType: gradingType || null,
        headerRow: headerRow || 1,
        columnPattern: columnPattern || '',
        dataSourceType: dataSourceType || 'single_sheet',
        sheetTabs: sheetTabs || '',
        labWeight: labWeight || null,
        labMaxScore: labMaxScore || null
      });
    }

    // Clear cache so new subject is immediately available
    const { clearSubjectsCache, clearSheetsCache } = await import('@/lib/sheets');
    const { invalidateSubjectConfigCache } = await import('@/lib/subjectConfigCache');
    clearSubjectsCache();
    clearSheetsCache(); // Clear sheets data cache as well
    invalidateSubjectConfigCache(); // Clear all subject config cache

    // Auto-fetch student prefixes once to warm up cache for new subjects
    if (!editingSubject && googleSheetId) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/student-prefixes?subject=${code}`);
      } catch (e: any) {
        // Silently ignore cache warming errors
        console.warn(`[Subject Creation] Cache warming failed for ${code}:`, e.message);
      }
    }

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
    const { code, ...updates } = body;

    if (!code) {
      return NextResponse.json({ error: "Subject code is required" }, { status: 400 });
    }

    const { updateSubject } = await import("@/lib/db");
    
    // Use the full updateSubject function from db.ts
    // This supports title, description, icon, color, visibility, order, AND the new flags
    const updated = await updateSubject(code, updates);

    if (!updated) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Clear cache so updated subject configuration is immediately available
    const { clearSubjectsCache, clearSheetsCache } = await import('@/lib/sheets');
    const { invalidateSubjectConfigCache } = await import('@/lib/subjectConfigCache');
    clearSubjectsCache();
    clearSheetsCache(code); // Clear sheets data cache for this subject
    invalidateSubjectConfigCache(code); // Clear specific subject's config cache

    return NextResponse.json({ success: true, message: "Subject updated successfully", subject: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    // Only main admin can manage subjects
    if (!user || user.username !== 'kanzaki_aito') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: "Subject code is required" }, { status: 400 });
    }

    // Call deleteSubject from db
    const { deleteSubject } = await import("@/lib/db");
    const success = await deleteSubject(code);

    if (!success) {
      return NextResponse.json({ error: "Subject not found or could not be deleted" }, { status: 404 });
    }

    // Clear cache so deleted subject is immediately removed from cache
    const { clearSubjectsCache, clearSheetsCache } = await import('@/lib/sheets');
    const { invalidateSubjectConfigCache } = await import('@/lib/subjectConfigCache');
    clearSubjectsCache();
    clearSheetsCache(code); // Clear sheets data cache for this subject
    invalidateSubjectConfigCache(code); // Clear specific subject's config cache

    return NextResponse.json({ success: true, message: "Subject deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
