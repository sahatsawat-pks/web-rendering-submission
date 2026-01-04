import { google } from 'googleapis';

const DEFAULT_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')!;

// Helper to determine spreadsheet ID based on subject
function getSpreadsheetId(subject: string): string {
    // Normalize subject to uppercase to match env convention (e.g. ITGE162 -> GOOGLE_SHEETS_ID_ITGE162)
    const upperSubject = subject.toUpperCase();
    const envVar = `GOOGLE_SHEETS_ID_${upperSubject}`;
    const specificId = process.env[envVar];
    
    if (specificId) {
        return specificId;
    }
    
    if (!DEFAULT_SPREADSHEET_ID) {
         throw new Error('Missing Google Sheets environment variables');
    }
    return DEFAULT_SPREADSHEET_ID;
}

async function getSheetsClient() {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google Sheets credential environment variables');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export async function getSheetData(sheetName: string = 'Sheet1') {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId(sheetName); // assume sheetName acts as subject (e.g. ITGE162)
  
  // If specific spreadsheet is used, the "Sheet Name" inside that file might just be "Sheet1" or something else.
  // However, current architecture assumes `sheetName` = `subject` = Tab Name (e.g. "ITGE162").
  // If user splits into files, they might name the internal tab "Sheet1" or "Scores".
  // For backwards compatibility: 
  // If individual file exists, try reading 'Sheet1' (default) OR keep using the subject name if they kept the same tab name in the new file.
  // Best guess: Try reading the subject name tab first.
  
  try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z1000`, 
      });
      return response.data.values || [];
  } catch (err: any) {
      // Fallback: If tab "ITGE162" doesn't exist in the specific ITGE162 file, try "Sheet1"
      if (err.code === 400 && spreadsheetId !== DEFAULT_SPREADSHEET_ID) {
           const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `Sheet1!A1:Z1000`, 
          });
          return response.data.values || [];
      }
      throw err;
  }
}

export async function getAllScores(sheetName: string = 'Sheet1') {
  const rows = await getSheetData(sheetName);
  if (rows.length === 0) return [];

  const headers = rows[0];
  const data = rows.slice(1);

  return data.map((row) => {
    const student: any = { username: row[0] };
    
    // Instead of hardcoding keys, valid keys should be found via Regex or matching
    // But since `getAllScores` usually returns the whole object, the Frontend might expect specific keys like "Lab 1".
    // Strategy: Map actual Headers to "Standardized Keys" for the Frontend.
    
    headers.slice(1).forEach((header, index) => {
        // Try to identify if this is a Lab Column
        const match = header.match(/^(?:Lab\s*|L)(\d+)(?:\s*\(.*\))?$/i);
        if (match) {
            // It's a lab column, e.g. "L01 (2)" -> "1"
            const labNum = parseInt(match[1]).toString(); 
            student[`Lab ${labNum}`] = row[index + 1];
        } else if (header.match(/Feedback/i)) {
             student[header] = row[index + 1];
        } else if (header.match(/^\s*(name|firstname)\s*$/i)) {
             student['name'] = row[index + 1];
        } else if (header.match(/^\s*(surname|lastname)\s*$/i)) {
             student['surname'] = row[index + 1];
        } else if (header.match(/^\s*(Sum|Total)(?:\s*\((\d+)\))?\s*$/i)) {
             // e.g. "Sum (26)" -> total: value, max_score: 26
             student['total'] = row[index + 1];
             const match = header.match(/\((\d+)\)/);
             if (match) {
                 student['max_score'] = match[1];
             }
        } else {
             // Keep original for other cols
             student[header] = row[index + 1];
        }
    });
    return student;
  });
}

export async function getStudentAllScores(username: string, sheetName: string = 'Sheet1') {
    const scores = await getAllScores(sheetName);
    return scores.find((s: any) => s.username === username) || null;
}

export async function getStudentLabScore(username: string, labNumber: string, sheetName: string = 'Sheet1') {
    const student = await getStudentAllScores(username, sheetName);
    if (!student) return null;
    
    // keys are now standardized by getAllScores to "Lab X"
    const labKey = `Lab ${parseInt(labNumber).toString()}`; // ensure "01" -> "1" match
    
    return {
        score: student[labKey],
        feedback: student[`${labKey} Feedback`] // This might need loose matching if Feedback naming varies
    };
}

export async function updateStudentLabScore(username: string, labNumber: string, score: number, feedback?: string, sheetName: string = 'Sheet1') {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId(sheetName);
  
  // Logic to determine internal "Tab Name"
  // Default: Use sheetName (e.g. "ITGE162") as Tab Name
  // Exception: If using a custom file (ID matches subject), maybe fallback to "Sheet1" if "ITGE162" tab is missing?
  // For writing, checking existence is expensive. Let's assume standard config:
  // If separated files -> Tab is expected to be "Sheet1" OR the Subject Name.
  // Let's stick to using `sheetName` variable as the Tab Target for now.
  // If user splits files, they should rename the tab to "ITGE162" to match, OR we need config for "Tab Name".
  // Simplest fix: Just use `sheetName`.
  
  const rows = await getSheetData(sheetName);
  
  if (rows.length === 0) {
      // Initialize sheet if empty
      const headers = ['Username', `Lab ${labNumber}`, `Lab ${labNumber} Feedback`];
      await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [headers] }
      });
      // Recursively call to proceed with update
      return updateStudentLabScore(username, labNumber, score, feedback, sheetName);
  }

  const headers = rows[0];
  
  // Normalize labNumber (e.g., "1" -> "01" and "1")
  const labNum = labNumber.toString();
  const labNumPad = labNum.length === 1 ? `0${labNum}` : labNum;

  // Flexible Regex to find column Index
  // Matches: "Lab 1", "L01", "L01 (2)", "Lab 01 (10)"
  const labRegex = new RegExp(`^(Lab\\s*${labNum}|L${labNum}|L${labNumPad})(\\s*\\(.*\\))?$`, 'i');
  
  let labIndex = headers.findIndex((h: string) => labRegex.test(h));
  
  // Feedback check (standardize on "Feedback" suffix or "Lxx Feedback")
  const feedbackRegex = new RegExp(`^(Lab\\s*${labNum}|L${labNum}|L${labNumPad})\\s*Feedback$`, 'i');
  let feedbackIndex = headers.findIndex((h: string) => feedbackRegex.test(h));

  // Add columns if they don't exist (Default to "Lab X")
  if (labIndex === -1) {
      labIndex = headers.length;
      headers.push(`Lab ${labNumber}`);
      // Update headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${getColumnLetter(labIndex + 1)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [[`Lab ${labNumber}`]] }
      });
  }
  
  // Optional: Only create feedback column if specifically requested or to keep schema consistent
  // User requested "don't add feedback", so we SKIP automatic creation.
  /* 
  if (feedbackIndex === -1) {
     ...
  }
  */

  let rowIndex = rows.findIndex((row) => row[0] === username);
  if (rowIndex === -1) {
    // specific to new row
    rowIndex = rows.length;
    const newRow = [username];
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'RAW',
        requestBody: { values: [newRow] }
    });
  } else {
     // User exists
  }

  // Update Score
  await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${getColumnLetter(labIndex + 1)}${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[score]] }
  });

  // Update Feedback - Only if column exists and feedback is provided
  if (feedback !== undefined && feedbackIndex !== -1) {
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${getColumnLetter(feedbackIndex + 1)}${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[feedback]] }
    });
  }
}

// Helper to convert index to letter (0 -> A, 1 -> B, etc.)
function getColumnLetter(colIndex: number) {
  let temp, letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
}

export async function batchUpdateScores(updates: {username: string, labNumber: string, score: number, feedback?: string, sheetName?: string}[]) {
    for (const update of updates) {
        await updateStudentLabScore(update.username, update.labNumber, update.score, update.feedback, update.sheetName);
    }
}

export async function fillMissingScores(subject: string, labNumber: string, value: string = '0') {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId(subject);
  const sheetName = subject; // Assuming tab name is the subject code

  // 1. Fetch all data to find the column and missing rows
  const rows = await getSheetData(sheetName);
  
  if (rows.length === 0) return { success: false, message: "Sheet is empty" };

  const headers = rows[0];
  const labNum = labNumber.toString();
  const labNumPad = labNum.length === 1 ? `0${labNum}` : labNum;

  // Regex to find column Index (same as in updateStudentLabScore)
  const labRegex = new RegExp(`^(Lab\\s*${labNum}|L${labNum}|L${labNumPad})(\\s*\\(.*\\))?$`, 'i');
  let labIndex = headers.findIndex((h: string) => labRegex.test(h));

  if (labIndex === -1) {
      return { success: false, message: `Column for Lab ${labNumber} not found. Please grade at least one student or create the column manually.` };
  }

  const updates = [];

  // 2. Iterate rows to find empty cells in that column
  // Start from index 1 (skip header)
  for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cellValue = row[labIndex];

      // If cell is undefined, null, or empty string, it needs filling
      if (cellValue === undefined || cellValue === null || cellValue === '') {
          // Construct the Range (e.g. C2)
          // Row is i + 1 (0-based array) + 1 (1-based sheet) = i + 1 ?? No.
          // rows[0] is Row 1. rows[1] is Row 2.
          // So row index i corresponds to Sheet Row i + 1.
          
          updates.push({
              range: `${sheetName}!${getColumnLetter(labIndex + 1)}${i + 1}`,
              values: [[value]]
          });
      }
  }

  if (updates.length === 0) {
      return { success: true, message: "No missing scores found.", count: 0 };
  }

  // 3. Batch Update
  await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
          valueInputOption: 'RAW',
          data: updates
      }
  });

  return { success: true, message: `Filled ${updates.length} missing scores with '${value}'.`, count: updates.length };
}
