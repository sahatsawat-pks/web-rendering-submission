import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.json');

interface Credential {
  id: string;
  studentId: string;
  credential: string;
  subject: string;
  createdAt: string;
}

function readDatabase() {
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

function writeDatabase(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const credential = searchParams.get('credential');

    const db = readDatabase();
    const credentials = db.credentials || [];

    // If looking up by credential code
    if (credential) {
      const found = credentials.find((c: Credential) => 
        c.credential === credential && 
        (!subject || c.subject === subject)
      );
      
      if (found) {
        return NextResponse.json({ 
          success: true, 
          studentId: found.studentId,
          credential: found 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Credential not found' 
        }, { status: 404 });
      }
    }

    // List all credentials for a subject
    if (subject) {
      const filtered = credentials.filter((c: Credential) => c.subject === subject);
      return NextResponse.json({ success: true, credentials: filtered });
    }

    // Return all credentials
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

    const db = readDatabase();
    if (!db.credentials) {
      db.credentials = [];
    }

    // Remove existing credentials for this subject
    db.credentials = db.credentials.filter((c: Credential) => c.subject !== subject);

    // Add new credentials
    const credentialsToAdd = newCredentials.map((cred: any) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studentId: cred.studentId,
      credential: cred.credential,
      subject: subject,
      createdAt: new Date().toISOString()
    }));

    db.credentials.push(...credentialsToAdd);
    writeDatabase(db);

    return NextResponse.json({ 
      success: true, 
      message: `Saved ${credentialsToAdd.length} credentials`,
      count: credentialsToAdd.length
    });

  } catch (error: any) {
    console.error('Error saving credentials:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
