import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCredentials } from '@/lib/db';
import { sendCredentialEmail, sendCredentialEmailsBatch } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, students, subject, testEmail } = body;

    // Test email functionality
    if (action === 'test') {
      if (!testEmail) {
        return NextResponse.json({ error: 'Test email address required' }, { status: 400 });
      }

      console.log(`[Send Credentials] Sending test email to ${testEmail}`);
      
      const result = await sendCredentialEmail({
        to: testEmail,
        studentName: 'Test Student',
        credential: 'TEST123',
        subjects: subject ? [subject] : ['ITCS123', 'ITCS223', 'ITCS227']
      });

      if (result.success) {
        return NextResponse.json({ 
          success: true, 
          message: `Test email sent successfully to ${testEmail}`,
          messageId: result.messageId
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: result.error 
        }, { status: 500 });
      }
    }

    // Send credentials to students
    if (action === 'send') {
      if (!students || !Array.isArray(students) || students.length === 0) {
        return NextResponse.json({ error: 'Students array required' }, { status: 400 });
      }

      console.log(`[Send Credentials] Processing ${students.length} students`);

      // Fetch credentials for each student
      const studentsWithCredentials = [];
      const errors = [];

      for (const student of students) {
        const { email, studentId, name } = student;

        if (!email || !studentId) {
          errors.push({ studentId: studentId || 'unknown', error: 'Missing email or studentId' });
          continue;
        }

        // Get credential from database
        const credentials = await getCredentials(undefined, undefined, studentId);
        
        if (credentials.length === 0) {
          errors.push({ studentId, error: 'No credential found' });
          continue;
        }

        studentsWithCredentials.push({
          email,
          name: name || studentId,
          credential: credentials[0].credential
        });
      }

      console.log(`[Send Credentials] Found credentials for ${studentsWithCredentials.length} students, ${errors.length} errors`);

      if (studentsWithCredentials.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'No valid students with credentials found',
          errors 
        }, { status: 400 });
      }

      // Send emails in batches
      const results = await sendCredentialEmailsBatch(
        studentsWithCredentials,
        subject ? [subject] : undefined,
        10, // batch size
        1000 // 1 second delay between batches
      );

      // Count successes and failures
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;

      return NextResponse.json({
        success: true,
        message: `Sent ${successes} emails successfully, ${failures} failed`,
        total: studentsWithCredentials.length,
        successes,
        failures,
        errors: errors.length > 0 ? errors : undefined,
        results
      });
    }

    // Fetch students with credentials (for preview)
    if (action === 'preview') {
      const { studentIds } = body;

      if (!studentIds || !Array.isArray(studentIds)) {
        return NextResponse.json({ error: 'Student IDs array required' }, { status: 400 });
      }

      const preview = [];
      for (const studentId of studentIds) {
        const credentials = await getCredentials(undefined, undefined, studentId);
        if (credentials.length > 0) {
          preview.push({
            studentId,
            credential: credentials[0].credential,
            hasCredential: true
          });
        } else {
          preview.push({
            studentId,
            hasCredential: false
          });
        }
      }

      return NextResponse.json({ success: true, preview });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('[Send Credentials] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
