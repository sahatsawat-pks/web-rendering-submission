import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get permissions
  const { getUserPermissions, getSubjects } = await import("@/lib/db");
  const userPerms = await getUserPermissions(user.userId);
  const allSubjects = await getSubjects(); // Get all subjects from database
  
  // Dynamically build permissions object for all subjects
  const permissions: { [key: string]: boolean } = {};
  allSubjects.forEach(subject => {
    permissions[subject.code.toLowerCase()] = userPerms.some(p => p.subjectCode === subject.code.toLowerCase() && p.canEdit);
  });

  // Return current user info with no caching headers
  return NextResponse.json({ 
    userId: user.userId, 
    username: user.username,
    role: user.role,
    permissions
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}
