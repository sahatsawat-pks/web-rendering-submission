import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { findUserByUsername, updateUserPassword } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new passwords are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
        return NextResponse.json(
            { error: "New password must be at least 6 characters long" },
            { status: 400 }
        );
    }

    // Verify current password
    // We need to fetch the user again to get the current hash
    const user = await findUserByUsername(authUser.username);
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 403 });
    }

    // Update password (updateUserPassword handles hashing)
    const success = await updateUserPassword(authUser.userId, newPassword);

    if (success) {
         return NextResponse.json({ success: true });
    } else {
         return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
