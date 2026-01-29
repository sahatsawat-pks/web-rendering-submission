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

  // Only kanzaki_aito can modify permissions
  if (authUser.username !== "kanzaki_aito") {
    return NextResponse.json({ 
      error: "Only the main admin can modify permissions" 
    }, { status: 403 });
  }

  try {
    const { userId, subjectCode, canEdit } = await request.json();

    if (!userId || !subjectCode || typeof canEdit !== "boolean") {
      return NextResponse.json(
        { error: "userId, subjectCode, and canEdit are required" },
        { status: 400 }
      );
    }

    await upsertPermission(userId, subjectCode, canEdit, authUser.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
