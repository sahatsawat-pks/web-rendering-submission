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

import * as XLSX from 'xlsx';

async function getAuthClient() {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google Sheets credential environment variables');
  }
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly' 
    ],
  });
}

async function getSheetsClient() {
  const auth = await getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

async function getDriveClient() {
    const auth = await getAuthClient();
    return google.drive({ version: 'v3', auth });
}

async function getXlsxData(spreadsheetId: string, tabName: string) {
    console.log(`[getXlsxData] Fallback for XLSX: ${spreadsheetId}, Tab: ${tabName}`);
    try {
        const drive = await getDriveClient();
        const res = await drive.files.get({
            fileId: spreadsheetId,
            alt: 'media',
        }, { responseType: 'arraybuffer' });

        const buffer = Buffer.from(res.data as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        // Determine sheet name
        // "Sec1" might match "Sec1" in Excel.
        // If tabName doesn't exist, maybe use first sheet?
        let targetSheet = tabName;
        if (!workbook.Sheets[targetSheet]) {
            // Check if tabName is arguably the subject code like "ITGE162" but sheet is named "Sheet1"
            if (workbook.SheetNames.length > 0) {
                 // But wait, ITCS123 has Sec1, Sec2. 
                 // If we requested Sec1 and it's missing, we should fail or return empty.
                 // However, we can try to be smart matching?
                 // For now, assume exact match or fail unless it's the "Subject" fallback which might map to "Sheet1"
                 
                 if (workbook.Sheets['Sheet1']) {
                     console.log(`[getXlsxData] Tab '${tabName}' not found, trying 'Sheet1' fallback.`);
                     targetSheet = 'Sheet1';
                 } else {
                     // Last resort: First sheet
                     console.log(`[getXlsxData] Tab '${tabName}' not found, using first sheet '${workbook.SheetNames[0]}'.`);
                     targetSheet = workbook.SheetNames[0];
                 }
            }
        }

        const worksheet = workbook.Sheets[targetSheet];
        if (!worksheet) return [];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        return jsonData as any[][];

    } catch (e: any) {
        console.error(`[getXlsxData] Failed to parse XLSX: ${e.message}`);
        return [];
    }
}

export async function getSheetData(subject: string = 'Sheet1', tabName?: string) {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId(subject);
  const targetTab = tabName || subject;

  try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${targetTab}!A1:Z1000`, 
      });
      return response.data.values || [];
  } catch (err: any) {
      // Check for XLSX error (400 Bad Request usually, or specific message)
      // Message: "This operation is not supported for this document"
      const isXlsxError = err.code === 400 || (err.message && err.message.includes('not supported'));
      
      if (isXlsxError) {
          console.log(`[getSheetData] Detected potential XLSX file (Error ${err.code}), attempting fallback.`);
          return await getXlsxData(spreadsheetId, targetTab);
      }

      // Existing fallback for mismatched tab names on standard sheets
      if (err.code === 400 && !tabName && targetTab !== 'Sheet1') {
           try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `Sheet1!A1:Z1000`, 
                });
                return response.data.values || [];
           } catch (e) {
               throw err;
           }
      }
      throw err;
  }
}

// Helper to map raw rows to student objects
function mapRowsToStudents(rows: any[][], subject: string): any[] {
  if (rows.length === 0) return [];

  const headers = rows[0];
  const data = rows.slice(1);
  const idIndex = subject === 'ITCS123' ? 1 : 0;

  return data.map((row) => {
    const rawUsername = row[idIndex];
    const student: any = { username: rawUsername ? String(rawUsername).trim() : "" };
    
    if (subject === 'ITCS123') {
        // Specific mapping allows for Thai names
        // Index 3: First, 4: Last, 5: Nickname
        student['name'] = row[3];
        student['surname'] = row[4];
        student['nickname'] = row[5];
    }
    
    headers.slice(1).forEach((header: string, index: number) => {
        // Safe access to row data
         const cellValue = row[index + 1];

        // Try to identify if this is a Lab Column
        const match = header.match(/^(?:Lab\s*|L)(\d+)(?:\s*\(.*\))?$/i);
        const chMatch = header.match(/^(?:Ch\s*|Challenge\s*)(\d+)(?:\s*\(.*\))?$/i);
        
        if (match) {
            // It's a lab column, e.g. "L01 (2)" -> "1"
            const labNum = parseInt(match[1]).toString(); 
            student[`Lab ${labNum}`] = cellValue;
        } else if (chMatch) {
            // It's a challenge column, e.g. "Ch01 (2)" -> "1"
            const chNum = parseInt(chMatch[1]).toString();
            student[`Challenge ${chNum}`] = cellValue;
        } else if (header.match(/Feedback/i)) {
             student[header] = cellValue;
        } else if (header.match(/^\s*(name|firstname)\s*$/i)) {
             if (subject !== 'ITCS123') student['name'] = cellValue;
        } else if (header.match(/^\s*(surname|lastname)\s*$/i)) {
             if (subject !== 'ITCS123') student['surname'] = cellValue;
        } else if (header.match(/^\s*(Sum|Total)(?:\s*\((\d+)\))?\s*$/i)) {
             student['total'] = cellValue;
             const match = header.match(/\((\d+)\)/);
             if (match) {
                 student['max_score'] = match[1];
             }
        } else {
             // Keep original for other cols
             student[header] = cellValue;
        }
    });
    return student;
  });
}

export async function getAllScores(subject: string = 'Sheet1') {
  if (subject === 'ITCS123') {
      try {
        // Fetch from Sec1, Sec2, Sec3
        const [sec1, sec2, sec3] = await Promise.all([
            getSheetData(subject, 'Sec1').catch(() => []),
            getSheetData(subject, 'Sec2').catch(() => []), 
            getSheetData(subject, 'Sec3').catch(() => [])
        ]);

        let allStudents: any[] = [];
        const sections = [
            { data: sec1, id: '1' },
            { data: sec2, id: '2' },
            { data: sec3, id: '3' }
        ];

        for (const sec of sections) {
            if (sec.data && sec.data.length > 0) {
                 const studs = mapRowsToStudents(sec.data, subject);
                 // Inject Section ID
                 studs.forEach(s => s.Section = sec.id);
                 allStudents = [...allStudents, ...studs];
            }
        }
        
        return allStudents;

      } catch (e) {
          console.error("Error fetching ITCS123 sections:", e);
          return [];
      }
  }

  // Standard Logic
  const rows = await getSheetData(subject);
  return mapRowsToStudents(rows, subject);
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

  // Determine ID column index
  const idIndex = sheetName === 'ITCS123' ? 1 : 0;
  console.log(`[updateStudentLabScore] Sheet: ${sheetName}, idIndex: ${idIndex}, SearchUser: ${username}`);
  
  let rowIndex = rows.findIndex((row) => {
      const val = row[idIndex];
      // console.log(`Checking row: ${val} vs ${username}`);
      return String(val).trim() === String(username).trim();
  });
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
