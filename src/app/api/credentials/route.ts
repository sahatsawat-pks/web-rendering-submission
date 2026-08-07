import { NextRequest, NextResponse } from 'next/server';
import { getCredentials, saveCredentials, getUserPermissions, deleteAllCredentialsEverywhere, findUserByUsername } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getCanonicalSubjectCodeOrDefault } from '@/lib/subjectConfig';
import { verifyPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const credential = searchParams.get('credential');
    const studentId = searchParams.get('studentId');

    // Scenario 1: Public access - Single credential lookup for student OR staff login
    if (credential) {
      // 1. Check student credentials table
      const credentials = await getCredentials(
        subject || undefined, 
        credential,
        undefined
      );
      
      if (credentials.length > 0) {
        const found = credentials.find(c => 
          !studentId || c.studentId.toLowerCase() === studentId.trim().toLowerCase()
        ) || credentials[0];

        if (!studentId || found.studentId.toLowerCase() === studentId.trim().toLowerCase()) {
          return NextResponse.json({ 
            success: true, 
            studentId: found.studentId,
            credential: found
          }, { headers: NO_CACHE_HEADERS });
        }
      }

      // 2. Check if studentId / username belongs to a Staff User (Lecturer, LA, Main Admin)
      const searchUsername = (studentId || credential).trim();
      const staffUser = await findUserByUsername(searchUsername);

      if (staffUser && staffUser.password) {
        const isValidStaffPass = await verifyPassword(credential, staffUser.password);
        if (isValidStaffPass) {
          return NextResponse.json({
            success: true,
            studentId: staffUser.username,
            isStaff: true,
            role: staffUser.role,
            credential: { studentId: staffUser.username, credentialCode: credential }
          }, { headers: NO_CACHE_HEADERS });
        }
      }

      // 3. Fallback: Check if currently authenticated staff user is accessing
      const currentAuth = await getAuthUser();
      if (currentAuth && (studentId ? currentAuth.username.toLowerCase() === studentId.trim().toLowerCase() : true)) {
        return NextResponse.json({
          success: true,
          studentId: currentAuth.username,
          isStaff: true,
          role: currentAuth.role,
          credential: { studentId: currentAuth.username, credentialCode: credential }
        }, { headers: NO_CACHE_HEADERS });
      }

      return NextResponse.json({ 
        success: false, 
        message: 'Invalid Student ID, Staff Username, or Credential' 
      }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // Scenario 2: Protected access - Listing credentials (for Admin/Lecturer)
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const canonicalSubject = getCanonicalSubjectCodeOrDefault(subject) || undefined;

    // Check permissions if subject is specified
    if (subject && user.username !== 'kanzaki_aito') {
      const userPerms = await getUserPermissions(user.userId);
      const targetCanonicalLower = canonicalSubject?.toLowerCase();
      const hasPermission = userPerms.some(p => {
        if (!p.canEdit) return false;
        const pLower = p.subjectCode.toLowerCase();
        const pCanonicalLower = (getCanonicalSubjectCodeOrDefault(pLower) || pLower).toLowerCase();
        return pLower === targetCanonicalLower || pCanonicalLower === targetCanonicalLower;
      });

      const isAuthorizedRole = ['Lecturer', 'Main Admin'].includes(user.role) || user.username === 'kanzaki_aito';
      if (!hasPermission && !isAuthorizedRole) {
        return NextResponse.json({ error: "Forbidden: Restricted to Lecturers and Main Admins" }, { status: 403, headers: NO_CACHE_HEADERS });
      }
    }

    const credentials = await getCredentials(canonicalSubject, undefined, studentId || undefined);

    return NextResponse.json({
      success: true,
      credentials: credentials.map(c => ({
        id: c.id,
        subject: c.subject,
        studentId: c.studentId,
        credentialCode: c.credential,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    }, { headers: NO_CACHE_HEADERS });

  } catch (error) {
    console.error('Error handling credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await request.json();
    const { subject: rawSubject, credentials, action, overwriteExisting } = body;
    const subject = getCanonicalSubjectCodeOrDefault(rawSubject) || rawSubject;

    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Permission check
    if (user.username !== 'kanzaki_aito') {
      const userPerms = await getUserPermissions(user.userId);
      const targetCanonicalLower = subject.toLowerCase();
      const hasPermission = userPerms.some(p => {
        if (!p.canEdit) return false;
        const pLower = p.subjectCode.toLowerCase();
        const pCanonicalLower = (getCanonicalSubjectCodeOrDefault(pLower) || pLower).toLowerCase();
        return pLower === targetCanonicalLower || pCanonicalLower === targetCanonicalLower;
      });

      const isAuthorizedRole = ['Lecturer', 'Main Admin'].includes(user.role) || user.username === 'kanzaki_aito';
      if (!hasPermission && !isAuthorizedRole) {
        return NextResponse.json({ error: "Forbidden: Restricted to Lecturers and Main Admins" }, { status: 403, headers: NO_CACHE_HEADERS });
      }
    }

    if (action === 'delete_all_everywhere') {
      const count = await deleteAllCredentialsEverywhere();
      return NextResponse.json({
        success: true,
        message: `Successfully deleted all ${count} credentials across all subjects`
      }, { headers: NO_CACHE_HEADERS });
    }

    if (!Array.isArray(credentials)) {
      return NextResponse.json({ error: "Credentials must be an array" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    await saveCredentials(credentials, subject, Boolean(overwriteExisting));

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${credentials.length} credentials for ${subject}`
    }, { headers: NO_CACHE_HEADERS });

  } catch (error) {
    console.error('Error saving credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
