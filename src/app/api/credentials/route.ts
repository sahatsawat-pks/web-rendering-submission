import { NextRequest, NextResponse } from 'next/server';
import { getCredentials, saveCredentials, getUserPermissions } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
            });
        } else {
            return NextResponse.json({ 
                success: false, 
                message: 'Credential not found' 
            }, { status: 404 });
        }
    }

    // Scenario 2: Protected access - Listing credentials (for Admin/Lecturer)
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions if subject is specified
    if (subject && user.username !== 'kanzaki_aito') {
        const userPerms = await getUserPermissions(user.userId);
        // Assuming 'Lecturer' implies canEdit, or we check role directly.
        // Usually canEdit is enough proxy for higher privilege.
        const hasPermission = userPerms.some(p => p.subjectCode === subject.toLowerCase() && p.canEdit);
        
        // Also check if user is a 'Lecturer' globally if subject-specific permission logic is specific
        // For now, rely on canEdit which we use for other admin tasks
        if (!hasPermission && user.role !== 'Lecturer') {
             return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    } else if (user.username !== 'kanzaki_aito' && user.role !== 'Lecturer') {
        // If no subject specified, only Main Admin or Lecturer can list ALL?
        // Maybe restrict to Main Admin for global list
         return NextResponse.json({ error: "Forbidden: Access restricted to Lecturer and Main Admin" }, { status: 403 });
    }

    const credentials = await getCredentials(
      subject || undefined, 
      undefined,
      studentId || undefined
    );

    return NextResponse.json({ success: true, credentials });

  } catch (error: any) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { credentials: newCredentials, subject } = body;

    // Permission Check
    if (user.username !== 'kanzaki_aito') {
        if (!subject) {
             return NextResponse.json({ error: "Forbidden: Main Admin only for global operations" }, { status: 403 });
        }
        
        // Check if user is Lecturer or has Edit permissions for this subject
        const userPerms = await getUserPermissions(user.userId);
        const hasPermission = userPerms.some(p => p.subjectCode === subject.toLowerCase() && p.canEdit);
        
        if (!hasPermission && user.role !== 'Lecturer') {
             return NextResponse.json({ error: "Forbidden: Lecturer or Admin access required" }, { status: 403 });
        }
    }

    if (!newCredentials || !Array.isArray(newCredentials)) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials data' },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { success: false, message: 'Subject is required' },
        { status: 400 }
      );
    }

    const count = await saveCredentials(newCredentials, subject);

    return NextResponse.json({ 
      success: true, 
      message: `Saved ${count} credentials`,
      count
    });

  } catch (error: any) {
    console.error('Error saving credentials:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subject, removeAll } = body;

    // Permission Check
    if (user.username !== 'kanzaki_aito') {
         if (!subject) {
             return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const userPerms = await getUserPermissions(user.userId);
        const hasPermission = userPerms.some(p => p.subjectCode === subject.toLowerCase() && p.canEdit);
        
        if (!hasPermission && user.role !== 'Lecturer') {
             return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    if (!subject) {
      return NextResponse.json(
        { success: false, message: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!removeAll) {
      return NextResponse.json(
        { success: false, message: 'removeAll flag must be true to delete credentials' },
        { status: 400 }
      );
    }

    // Import the deleteAllCredentials function
    const { deleteAllCredentials } = await import('@/lib/db');
    
    // Delete all credentials for the subject
    const count = await deleteAllCredentials(subject);

    return NextResponse.json({ 
      success: true, 
      message: `Removed ${count} credentials for ${subject}`,
      count
    });

  } catch (error: any) {
    console.error('Error removing credentials:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
