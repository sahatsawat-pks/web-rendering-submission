import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDb, createUser, findUserByUsername } from "@/lib/db";
import { hashPassword } from "@/lib/password"; // Correct import

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  
  // Ensure userPermissions exists
  if (!db.data.userPermissions) {
    db.data.userPermissions = [];
  }

  // Return users without passwords, but with permissions
  const safeUsers = db.data.users.map(({ password, ...u }) => {
    // Get permissions for this user
    const userPerms = db.data.userPermissions.filter(p => p.userId === u.id);
    
    // Convert to object format { itcs223: true, itcs227: false, ... }
    const permissions = {
      itcs223: userPerms.some(p => p.subjectCode === "itcs223" && p.canEdit),
      itcs227: userPerms.some(p => p.subjectCode === "itcs227" && p.canEdit),
      itge162: userPerms.some(p => p.subjectCode === "itge162" && p.canEdit),
      itcs123: userPerms.some(p => p.subjectCode === "itcs123" && p.canEdit),
    };

    return { ...u, permissions };
  });
  
  return NextResponse.json({ users: safeUsers });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (await findUserByUsername(username)) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Creating user automatically hashes password in createUser
    const newUser = await createUser(username, password);
    const { password: _, ...safeUser } = newUser;

    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (id === authUser.userId) { // Correct property: userId
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 403 }
      );
    }

    const db = await getDb();
    const initialLength = db.data.users.length;
    db.data.users = db.data.users.filter((u) => u.id !== id);

    if (db.data.users.length < initialLength) {
      await db.write();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
