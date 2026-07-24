import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserPermissions, getAllPermissions, upsertPermission } from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET: Retrieve permissions for a specific user or all users
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  
  try {
      if (userId) {
        const userPerms = await getUserPermissions(userId);
        return NextResponse.json({ permissions: userPerms });
      }

      const allPerms = await getAllPermissions();
      return NextResponse.json({ permissions: allPerms });
  } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Update permissions for a user
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, subjectCode, canEdit } = await request.json();

    if (!userId || !subjectCode || typeof canEdit !== "boolean") {
      return NextResponse.json(
        { error: "userId, subjectCode, and canEdit are required" },
        { status: 400 }
      );
    }

    const normalizedSubjectCode = subjectCode.toLowerCase();
    const isMainAdmin = authUser.username === "kanzaki_aito";
    const isInstructor = authUser.role === "Lecturer";

    if (!isMainAdmin && !isInstructor) {
      return NextResponse.json({ 
        error: "Forbidden: Only admins and instructors can modify user permissions" 
      }, { status: 403 });
    }

    if (!isMainAdmin) {
      // Check if instructor has edit permission for this subject
      const callerPerms = await getUserPermissions(authUser.userId);
      const hasSubjectPermission = callerPerms.some(
        p => p.subjectCode.toLowerCase() === normalizedSubjectCode && p.canEdit
      );

      if (!hasSubjectPermission) {
        return NextResponse.json({ 
          error: "Forbidden: You can only modify permissions for subjects you have taught" 
        }, { status: 403 });
      }
    }

    await upsertPermission(userId, normalizedSubjectCode, canEdit, authUser.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
