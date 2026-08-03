import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getCanonicalSubjectCode } from "@/lib/subjectConfig";

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
  
  // Dynamically build permissions object for all subjects and their aliases
  const permissions: { [key: string]: boolean } = {};
  allSubjects.forEach(subject => {
    const mainCodeLower = subject.code.toLowerCase();
    const canonicalCodeLower = (getCanonicalSubjectCode(subject.code) || subject.code).toLowerCase();

    const hasPerm = userPerms.some(p => {
      if (!p.canEdit) return false;
      const pCodeLower = p.subjectCode.toLowerCase();
      const pCanonicalLower = (getCanonicalSubjectCode(pCodeLower) || pCodeLower).toLowerCase();
      return pCodeLower === mainCodeLower || pCodeLower === canonicalCodeLower || pCanonicalLower === canonicalCodeLower;
    });

    permissions[mainCodeLower] = hasPerm;

    // Grant permission for aliases too
    (subject.aliases || []).forEach((alias: string) => {
      permissions[alias.toLowerCase()] = hasPerm;
    });
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
