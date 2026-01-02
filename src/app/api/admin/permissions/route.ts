import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// GET: Retrieve permissions for a specific user or all users
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const db = await getDb();
  
  if (!db.data.userPermissions) {
    db.data.userPermissions = [];
  }

  if (userId) {
    const userPerms = db.data.userPermissions.filter(p => p.userId === userId);
    return NextResponse.json({ permissions: userPerms });
  }

  return NextResponse.json({ permissions: db.data.userPermissions });
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

    const db = await getDb();
    
    if (!db.data.userPermissions) {
      db.data.userPermissions = [];
    }

    // Find existing permission
    const existingIndex = db.data.userPermissions.findIndex(
      p => p.userId === userId && p.subjectCode === subjectCode
    );

    if (existingIndex >= 0) {
      // Update existing permission
      db.data.userPermissions[existingIndex].canEdit = canEdit;
      db.data.userPermissions[existingIndex].updatedAt = new Date().toISOString();
    } else {
      // Create new permission
      db.data.userPermissions.push({
        id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        subjectCode,
        canEdit,
        grantedBy: authUser.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await db.write();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
