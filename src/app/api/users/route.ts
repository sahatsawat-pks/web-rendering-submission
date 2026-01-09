import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createUser, findUserByUsername, getAllUsers, deleteUser, getUserPermissions, updateUserRole, updateUserPassword } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getAllUsers();
  
  // Return users without passwords, but with permissions
  const safeUsers = await Promise.all(users.map(async ({ password, ...u }) => {
    // Get permissions for this user
    const userPerms = await getUserPermissions(u.id);
    
    // Convert to object format { itcs223: true, itcs227: false, ... }
    const permissions = {
      itcs223: userPerms.some(p => p.subjectCode === "itcs223" && p.canEdit),
      itcs227: userPerms.some(p => p.subjectCode === "itcs227" && p.canEdit),
      itge162: userPerms.some(p => p.subjectCode === "itge162" && p.canEdit),
      itcs123: userPerms.some(p => p.subjectCode === "itcs123" && p.canEdit),
      itcs251: userPerms.some(p => p.subjectCode === "itcs251" && p.canEdit),
      itcs255: userPerms.some(p => p.subjectCode === "itcs255" && p.canEdit),
      itds283: userPerms.some(p => p.subjectCode === "itds283" && p.canEdit),
    };

    return { ...u, permissions };
  }));
  
  return NextResponse.json({ users: safeUsers });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username, password, role } = await request.json();

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
    const newUser = await createUser(username, password, role || 'LA');
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

    const deleted = await deleteUser(id);

    if (deleted) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only kanzaki_aito can modify roles
  if (authUser.username !== "kanzaki_aito") {
    return NextResponse.json({ 
      error: "Only the main admin can modify user roles" 
    }, { status: 403 });
  }

  try {
    const { id, role, password } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Handle password change
    if (password) {
      const updated = await updateUserPassword(id, password);
      if (updated) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle role change
    if (role) {
      if (role !== 'LA' && role !== 'Lecturer') {
        return NextResponse.json({ error: "Invalid role. Must be 'LA' or 'Lecturer'" }, { status: 400 });
      }

      const updated = await updateUserRole(id, role);
      if (updated) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "No update data provided" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
