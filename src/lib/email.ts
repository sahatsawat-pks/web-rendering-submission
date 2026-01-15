import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'MUICT Web Rendering Platform';

// Initialize Email Provider
// Priority: SMTP > Resend
const smtpConfig = process.env.SMTP_HOST ? {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
} : null;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendCredentialEmailParams {
  to: string;
  studentName: string;
  credential: string;
  subjects?: string[];
}

/**
 * Generate HTML email template for credential notification
 */
function generateCredentialEmailHTML(params: SendCredentialEmailParams): string {
  // ... (keep existing template generation logic) ...
  const { studentName, credential, subjects = [] } = params;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your MUICT Platform Credentials</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #6366f1;
    }
    .header h1 {
      color: #6366f1;
      margin: 0;
      font-size: 24px;
    }
    .credential-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      margin: 30px 0;
    }
    .credential-code {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      margin: 10px 0;
      font-family: 'Courier New', monospace;
    }
    .instructions {
      background-color: #f8f9fa;
      border-left: 4px solid #6366f1;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .instructions h3 {
      margin-top: 0;
      color: #6366f1;
    }
    .instructions ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    .instructions li {
      margin: 8px 0;
    }
    .subjects {
      margin: 20px 0;
    }
    .subject-tag {
      display: inline-block;
      background-color: #e0e7ff;
      color: #4338ca;
      padding: 6px 12px;
      border-radius: 4px;
      margin: 4px;
      font-size: 14px;
      font-weight: 500;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning strong {
      color: #d97706;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background-color: #6366f1;
      color: white !important;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 MUICT Web Rendering Platform</h1>
    </div>
    
    <p>Hello <strong>${studentName}</strong>,</p>
    
    <p>Welcome to the MUICT Web Rendering Platform! Your personal credential code has been generated.</p>
    
    <div class="credential-box">
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">Your Credential Code</p>
      <div class="credential-code">${credential}</div>
      <p style="margin: 0; font-size: 12px; opacity: 0.8;">This code works across all subjects</p>
    </div>
    
    ${subjects.length > 0 ? `
    <div class="subjects">
      <strong>Available for subjects:</strong><br>
      ${subjects.map(s => `<span class="subject-tag">${s}</span>`).join('')}
    </div>
    ` : ''}
    
    <div class="instructions">
      <h3>How to use your credential:</h3>
      <ol>
        <li>Visit your subject's score page (e.g., <code>/itcs223/score</code>)</li>
        <li>Enter your credential code: <strong>${credential}</strong></li>
        <li>View your lab scores and progress</li>
      </ol>
    </div>
    
    <div class="warning">
      <strong>⚠️ Important:</strong>
      <ul style="margin: 10px 0;">
        <li>Keep this code <strong>secure and confidential</strong></li>
        <li>Do not share your credential with others</li>
        <li>This code works for all your enrolled subjects</li>
        <li>If you lose your code, contact your instructor</li>
      </ul>
    </div>
    
    <p>Need help? Contact your course instructor or the platform administrator.</p>
    
    <div class="footer">
      <p><strong>MUICT Web Rendering Platform</strong></p>
      <p>Developed by Kanzaki Aito</p>
      <p style="font-size: 12px; color: #9ca3af;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text version of the email
 */
function generateCredentialEmailText(params: SendCredentialEmailParams): string {
  // ... (keep existing text generation logic) ...
  const { studentName, credential, subjects = [] } = params;
  
  return `
Hello ${studentName},

Welcome to the MUICT Web Rendering Platform!

Your personal credential code is: ${credential}

${subjects.length > 0 ? `Available for subjects: ${subjects.join(', ')}` : ''}

How to use your credential:
1. Visit your subject's score page (e.g., /itcs223/score)
2. Enter your credential code: ${credential}
3. View your lab scores and progress

Important Notes:
- Keep this code secure and confidential
- Do not share your credential with others
- This code works for all your enrolled subjects
- If you lose your code, contact your instructor

Need help? Contact your course instructor.

---
MUICT Web Rendering Platform
Developed by Kanzaki Aito

This is an automated message. Please do not reply to this email.
  `.trim();
}

/**
 * Send credential notification email to a student
 */
export async function sendCredentialEmail(params: SendCredentialEmailParams) {
  try {
    console.log(`[Email] Sending credential to ${params.to}`);
    
    // Option 1: SMTP (Nodemailer)
    if (smtpConfig) {
      console.log('[Email] Using SMTP Provider');
      try {
        const transporter = nodemailer.createTransport(smtpConfig);
        
        await transporter.verify(); // Verify connection first
        
        const info = await transporter.sendMail({
          from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
          to: params.to,
          subject: 'Your MUICT Web Rendering Platform Access Credentials',
          html: generateCredentialEmailHTML(params),
          text: generateCredentialEmailText(params),
        });
        
        console.log('[Email] Sent successfully (SMTP):', info.messageId);
        return { success: true, messageId: info.messageId };
      } catch (error: any) {
        console.error('[Email] SMTP Error:', error);
        return { success: false, error: 'SMTP Error: ' + error.message };
      }
    }
    
    // Option 2: Resend
    if (resend) {
      console.log('[Email] Using Resend Provider');
      const { data, error } = await resend.emails.send({
        from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
        to: params.to,
        subject: 'Your MUICT Web Rendering Platform Access Credentials',
        html: generateCredentialEmailHTML(params),
        text: generateCredentialEmailText(params),
      });

      if (error) {
        console.error('[Email] Resend Error:', error);
        return { success: false, error: error.message };
      }

      console.log('[Email] Sent successfully (Resend):', data?.id);
      return { success: true, messageId: data?.id };
    }
    
    // No provider configured
    console.error('[Email] No email provider configured (SMTP or Resend)');
    return { success: false, error: 'No email provider configured' };
    
  } catch (error: any) {
    console.error('[Email] Exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send credential emails in batches to avoid rate limiting
 */
export async function sendCredentialEmailsBatch(
  students: Array<{ email: string; name: string; credential: string }>,
  subjects?: string[],
  batchSize: number = 10,
  delayMs: number = 1000
) {
  const results = [];
  
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);
    console.log(`[Email] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(students.length / batchSize)}`);
    
    const batchPromises = batch.map(student => 
      sendCredentialEmail({
        to: student.email,
        studentName: student.name,
        credential: student.credential,
        subjects
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Delay between batches to avoid rate limiting
    if (i + batchSize < students.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}
