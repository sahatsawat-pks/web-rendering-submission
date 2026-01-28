import { NextRequest, NextResponse } from 'next/server';
import { getCredentials, saveCredentials } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const credential = searchParams.get('credential');
    const studentId = searchParams.get('studentId');

    // console.log(`[Credentials API] GET request - subject: ${subject}, credential: ${credential}, studentId: ${studentId}`);

    const credentials = await getCredentials(
      subject || undefined, 
      credential || undefined,
      studentId || undefined
    );

    // console.log(`[Credentials API] Found ${credentials.length} credentials`);
    
    // Log credential codes for debugging
    if (credentials.length > 0) {
      const credCodes = credentials.map(c => c.credential).join(', ');
      // console.log(`[Credentials API] Credential codes: ${credCodes}`);
    }

    // If looking up by credential code
    if (credential) {
      if (credentials.length > 0) {
        // console.log(`[Credentials API] Credential match found:`, credentials[0]);
        return NextResponse.json({ 
          success: true, 
          studentId: credentials[0].studentId,
          credential: credentials[0]
        });
      } else {
        // console.log(`[Credentials API] No match for credential: ${credential}`);
        return NextResponse.json({ 
          success: false, 
          message: 'Credential not found' 
        }, { status: 404 });
      }
    }

    // Return all matching credentials
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
    const body = await request.json();
    const { credentials: newCredentials, subject } = body;

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
    const body = await request.json();
    const { subject, removeAll } = body;

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
