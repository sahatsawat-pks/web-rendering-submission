import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';
import { createUser, findUserByUsername, getAllUsers, deleteUser, getUserPermissions, updateUserRole, updateUserPassword, getSubjects } from "@/lib/db";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getAllUsers();
    const allSubjects = await getSubjects(); // Get all subjects from database
    
    // Return users without passwords, but with permissions
    const safeUsers = await Promise.all(users.map(async ({ password, ...u }) => {
      // Get permissions for this user
      const userPerms = await getUserPermissions(u.id);
      
      // Dynamically build permissions object for all subjects
      const permissions: { [key: string]: boolean } = {};
      allSubjects.forEach(subject => {
        permissions[subject.code.toLowerCase()] = userPerms.some(p => p.subjectCode === subject.code.toLowerCase() && p.canEdit);
      });

      return { ...u, permissions };
    }));
    
    return NextResponse.json({ users: safeUsers });
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, password, role, realName } = await request.json();

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
    const newUser = await createUser(username, password, role || 'LA', realName || '');
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
    const body = await request.json();
    const { id, role, password, username, newUsername, realName } = body;

    // Handle real name update
    if (id && realName !== undefined) {
      const { updateUserRealName } = await import("@/lib/db");
      const updated = await updateUserRealName(id, realName.trim());
      if (updated) {
        return NextResponse.json({ success: true, message: "Real name updated successfully" });
      }
      return NextResponse.json({ error: "Failed to update real name" }, { status: 500 });
    }

    // Handle username change by ID (main admin can change any user's username)
    if (id && newUsername) {
      if (!newUsername.trim()) {
        return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
      }

      // Check if new username already exists
      const existingUser = await findUserByUsername(newUsername.trim());
      if (existingUser) {
        return NextResponse.json({ error: "Username already exists" }, { status: 400 });
      }

      const { updateUsernameById } = await import("@/lib/db");
      const updated = await updateUsernameById(id, newUsername.trim());
      if (updated) {
        return NextResponse.json({ success: true, message: "Username updated successfully" });
      }
      return NextResponse.json({ error: "Failed to update username" }, { status: 500 });
    }

    // Legacy support: Handle username change by current username (for backward compatibility)
    if (username && newUsername) {
      if (!newUsername.trim()) {
        return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
      }

      // Check if new username already exists
      const existingUser = await findUserByUsername(newUsername.trim());
      if (existingUser) {
        return NextResponse.json({ error: "Username already exists" }, { status: 400 });
      }

      const { updateUsername } = await import("@/lib/db");
      const updated = await updateUsername(username, newUsername.trim());
      if (updated) {
        return NextResponse.json({ success: true, message: "Username updated successfully" });
      }
      return NextResponse.json({ error: "Failed to update username" }, { status: 500 });
    }

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
