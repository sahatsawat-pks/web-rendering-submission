import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get permissions
  const { getUserPermissions } = await import("@/lib/db");
  const userPerms = await getUserPermissions(user.userId);
  
  const permissions = {
    itcs223: userPerms.some(p => p.subjectCode === "itcs223" && p.canEdit),
    itcs227: userPerms.some(p => p.subjectCode === "itcs227" && p.canEdit),
    itge162: userPerms.some(p => p.subjectCode === "itge162" && p.canEdit),
    itcs123: userPerms.some(p => p.subjectCode === "itcs123" && p.canEdit),
    itcs251: userPerms.some(p => p.subjectCode === "itcs251" && p.canEdit),
    itcs255: userPerms.some(p => p.subjectCode === "itcs255" && p.canEdit),
    itds283: userPerms.some(p => p.subjectCode === "itds283" && p.canEdit),
  };

  // Return current user info
  return NextResponse.json({ 
    userId: user.userId, 
    username: user.username,
    role: user.role,
    permissions
  });
}
