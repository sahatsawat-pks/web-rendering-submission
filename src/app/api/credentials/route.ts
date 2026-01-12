import { NextRequest, NextResponse } from 'next/server';
import { getCredentials, saveCredentials } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const credential = searchParams.get('credential');

    const credentials = await getCredentials(
      subject || undefined, 
      credential || undefined
    );

    // If looking up by credential code
    if (credential) {
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

    // Import the db connection
    const db = require('@/lib/db').getDatabase();
    
    // Delete all credentials for the subject
    const result = db.prepare('DELETE FROM credentials WHERE subject = ?').run(subject);

    return NextResponse.json({ 
      success: true, 
      message: `Removed ${result.changes} credentials for ${subject}`,
      count: result.changes
    });

  } catch (error: any) {
    console.error('Error removing credentials:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
