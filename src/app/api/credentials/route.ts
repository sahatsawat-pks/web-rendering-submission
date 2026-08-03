import { NextRequest, NextResponse } from 'next/server';
import { getCredentials, saveCredentials, getUserPermissions, deleteAllCredentialsEverywhere } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getCanonicalSubjectCodeOrDefault } from '@/lib/subjectConfig';

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

    // Scenario 1: Public access - Single credential lookup for student login
    if (credential) {
       const credentials = await getCredentials(
          subject || undefined, 
          credential,
          undefined
        );
        
        if (credentials.length > 0) {
            return NextResponse.json({ 
                success: true, 
                studentId: credentials[0].studentId,
                credential: credentials[0]
            }, { headers: NO_CACHE_HEADERS });
        } else {
            return NextResponse.json({ 
                success: false, 
                message: 'Credential not found' 
            }, { status: 404, headers: NO_CACHE_HEADERS });
        }
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
        
        if (!hasPermission && user.role !== 'Lecturer') {
             return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_CACHE_HEADERS });
        }
    } else if (user.username !== 'kanzaki_aito' && user.role !== 'Lecturer') {
         return NextResponse.json({ error: "Forbidden: Access restricted to Lecturer and Main Admin" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const credentials = await getCredentials(
      canonicalSubject,
      undefined,
      studentId || undefined
    );

    return NextResponse.json({ success: true, credentials }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { success: false, message: error.message },
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
    const { credentials: newCredentials, subject } = body;
    const canonicalSubject = getCanonicalSubjectCodeOrDefault(subject);

    // Permission Check
    if (user.username !== 'kanzaki_aito') {
        if (!canonicalSubject) {
             return NextResponse.json({ error: "Forbidden: Main Admin only for global operations" }, { status: 403, headers: NO_CACHE_HEADERS });
        }
        
        const userPerms = await getUserPermissions(user.userId);
        const targetCanonicalLower = canonicalSubject.toLowerCase();
        const hasPermission = userPerms.some(p => {
          if (!p.canEdit) return false;
          const pLower = p.subjectCode.toLowerCase();
          const pCanonicalLower = (getCanonicalSubjectCodeOrDefault(pLower) || pLower).toLowerCase();
          return pLower === targetCanonicalLower || pCanonicalLower === targetCanonicalLower;
        });
        
        if (!hasPermission && user.role !== 'Lecturer') {
             return NextResponse.json({ error: "Forbidden: Lecturer or Admin access required" }, { status: 403, headers: NO_CACHE_HEADERS });
        }
    }

    if (!newCredentials || !Array.isArray(newCredentials)) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials data' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!canonicalSubject) {
      return NextResponse.json(
        { success: false, message: 'Subject is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const count = await saveCredentials(newCredentials, canonicalSubject);

    return NextResponse.json({ 
      success: true, 
      message: `Saved ${count} credentials`,
      count
    }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error('Error saving credentials:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    console.log('DELETE /api/credentials - User:', user?.username, 'Role:', user?.role);
    
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await request.json();
    const { subject, removeAll } = body;
    console.log('DELETE body:', { subject, removeAll });

    if (!removeAll) {
      return NextResponse.json(
        { success: false, message: 'removeAll flag must be true to delete credentials' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // When removing all, only Main Admin can do this
    if (user.username !== 'kanzaki_aito' && user.role !== 'Lecturer') {
      console.log('Permission denied - not Main Admin or Lecturer');
      return NextResponse.json({ error: "Forbidden: Only Main Admin or Lecturer can remove all credentials" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    console.log('Calling deleteAllCredentialsEverywhere()...');
    // Delete all credentials across all subjects
    const count = await deleteAllCredentialsEverywhere();
    console.log('Deletion result - rows deleted:', count);

    return NextResponse.json({ 
      success: true, 
      message: `Removed ${count} credentials from all subjects`,
      count
    }, { headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error('Error removing credentials:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
