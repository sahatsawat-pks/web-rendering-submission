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
    
    console.log(`[getSpreadsheetId] Subject: ${subject}, EnvVar: ${envVar}, ID found: ${specificId ? 'Yes' : 'No'}`);

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
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file' 
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

  // For ITCS251 and ITCS255, header starts at row 5
  const startRow = (subject === 'ITCS251' || subject === 'ITCS255') ? 5 : 1;
  const range = `${targetTab}!A${startRow}:Z1000`;

  try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
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

// Helper to fix mashed names (e.g., "NatanonKreangarekul" -> "Natanon Kreangarekul")
function fixMashedName(name: string): string {
    if (!name || typeof name !== 'string') return '';
    // If name has no spaces and has CamelCase (lower followed by Upper), split it.
    // Exclude 'Mc...' cases? Thai names don't have Mc.
    // Basic heuristic: lowercase char followed by Uppercase char.
    // This handles "FirstLast" -> "First Last"
    if (!name.includes(' ') && /[a-z][A-Z]/.test(name)) {
        return name.replace(/([a-z])([A-Z])/g, '$1 $2');
    }
    return name.trim();
}

// Helper to map raw rows to student objects
function mapRowsToStudents(rows: any[][], subject: string): any[] {
  if (rows.length === 0) return [];

  const headers = rows[0];
  const data = rows.slice(1);
  // ITCS123, ITCS223, ITCS251, ITCS255, and ITDS283 use index 1 (Column B) for ID
  let idIndex = (subject === 'ITCS123' || subject === 'ITCS223' || subject === 'ITCS251' || subject === 'ITCS255' || subject === 'ITDS283') ? 1 : 0;
  
  if (subject === 'ITDS283') {
      const foundIndex = headers.findIndex((h: string) => String(h).toLowerCase().trim() === 'id');
      if (foundIndex !== -1) idIndex = foundIndex;
  }

  return data.map((row) => {
    const rawUsername = row[idIndex];
    // console.log(`[mapRows] ${subject} ID: ${rawUsername}`);
    const student: any = { username: rawUsername ? String(rawUsername).trim() : "" };
    
    if (subject === 'ITCS123') {
        // Specific mapping allows for Thai names
        // Index 3: First, 4: Last, 5: Nickname
        student['name'] = fixMashedName(row[3]);
        student['surname'] = fixMashedName(row[4]);
        student['nickname'] = row[5];
    } else if (subject === 'ITCS223') {
        // ITCS223 Layout: B=ID(1), C=Name(2), D=Surname(3)
        student['name'] = fixMashedName(row[2]);
        student['surname'] = fixMashedName(row[3]);
    } else if (subject === 'ITCS227') {
        // ITCS227 Layout: A=ID(0), B-E=Other columns, F=Section(5)
        student['Section'] = row[5]; // Column F
    } else if (subject === 'ITCS251' || subject === 'ITCS255') {
        // ITCS251/ITCS255 Layout: B=ID(1), header at row 5
        // No additional fields needed for now
    } else if (subject === 'ITDS283') {
        // ITDS283 Structure: 
        // No(0), ID(1), Title(2), Fname(3), Lname(4), Nickname(5), EngName(6), Col3(7), Col4(8), NickEng(9), Email(10), Lab1(11)...
        // Note: The user said "Name in English" is col 6, "Column3" is 7.
        // Let's map useful fields.
        student['title'] = row[2];
        student['name'] = fixMashedName(row[3]);
        student['surname'] = fixMashedName(row[4]);
        student['nickname'] = row[5];
        student['engName'] = fixMashedName(row[6]); // Name in English
        student['nicknameEng'] = row[9]; // Nickname(Eng)
        student['email'] = row[10]; // MU eMail
    }
    
    headers.slice(1).forEach((header: string, index: number) => {
        // Safe access to row data
         const cellValue = row[index + 1];

        // Try to identify if this is a Lab Column
        // For ITCS251/ITCS255: "W 1", "W 2" format
        const wMatch = header.match(/^W\s*(\d+)$/i);
        const match = header.match(/^(?:Lab\s*|L)(\d+)(?:\s*\(.*\))?$/i);
        const chMatch = header.match(/^(?:Ch\s*|Challenge\s*)(\d+)(?:\s*\(.*\))?$/i);
        
        if (wMatch) {
            // It's a W column for ITCS251/ITCS255, e.g. "W 1" -> "Lab 1"
            const labNum = parseInt(wMatch[1]).toString();
            student[`Lab ${labNum}`] = cellValue;
        } else if (match) {
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
             if (subject !== 'ITCS123' && subject !== 'ITCS223' && subject !== 'ITDS283') student['name'] = fixMashedName(cellValue);
        } else if (header.match(/^\s*(surname|lastname)\s*$/i)) {
             if (subject !== 'ITCS123' && subject !== 'ITCS223' && subject !== 'ITDS283') student['surname'] = fixMashedName(cellValue);
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
    
    // ITCS223 Specific Calculation if Total is missing
    if (subject === 'ITCS223' && !student['total']) {
        const totalScoreVal = Object.keys(student).reduce((acc, key) => {
            if (key.startsWith('Lab ')) {
                return acc + (parseFloat(student[key]) || 0);
            }
            return acc;
        }, 0);
        student['total'] = totalScoreVal.toFixed(2).replace(/\.00$/, '');
        student['max_score'] = '22';
    }

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
  
  if (subject === 'ITCS223') {
      try {
        console.log('[Sheets] Fetching ITCS223 sections from Google Sheets...');
        
        // Fetch from Section 1, Section 2, Section 3 (User confirmed spaces)
        const [sec1, sec2, sec3] = await Promise.all([
            getSheetData(subject, 'Section 1').catch((e) => {
                 // Fallback to "Section1" if "Section 1" fails?
                 console.log("[Sheets] Failed Section 1, trying fallback", e.message);
                 return getSheetData(subject, 'Section1').catch(() => []);
            }),
            getSheetData(subject, 'Section 2').catch(() => getSheetData(subject, 'Section2').catch(() => [])), 
            getSheetData(subject, 'Section 3').catch(() => getSheetData(subject, 'Section3').catch(() => []))
        ]);

        console.log(`[Sheets] Raw data fetched - Sec1: ${sec1.length} rows, Sec2: ${sec2.length} rows, Sec3: ${sec3.length} rows`);

        let allStudents: any[] = [];
        const sections = [
            { data: sec1, id: '1' },
            { data: sec2, id: '2' },
            { data: sec3, id: '3' }
        ];

        for (const sec of sections) {
            if (sec.data && sec.data.length > 0) {
                 const studs = mapRowsToStudents(sec.data, subject);
                 console.log(`[Sheets] Section ${sec.id}: Mapped ${studs.length} students`);
                 // Inject Section ID
                 studs.forEach(s => s.Section = sec.id);
                 allStudents = [...allStudents, ...studs];
            }
        }
        
        console.log(`[Sheets] ITCS223 Total: ${allStudents.length} students loaded`);
        return allStudents;

      } catch (e) {
          console.error("[Sheets] Error fetching ITCS223 sections:", e);
          return [];
      }
  }

  if (subject === 'ITDS283') {
      try {
        // Fetch from Section 1 and Section 2
        // Assuming tab names are "Section 1" and "Section 2" based on user description "section 1 and section 2 sheet"
        // It might be "Sec1", "Sec2" too. Let's try flexible approach or stick to what user implied.
        // User said: "- have section 1 and section 2 sheet"
        // Let's assume standard "Section 1", "Section 2" first.
        
        const [sec1, sec2] = await Promise.all([
            getSheetData(subject, 'Section 1').catch(() => getSheetData(subject, 'Section1').catch(() => [])),
            getSheetData(subject, 'Section 2').catch(() => getSheetData(subject, 'Section2').catch(() => []))
        ]);

        let allStudents: any[] = [];
        const sections = [
            { data: sec1, id: '1' },
            { data: sec2, id: '2' }
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
          console.error("Error fetching ITDS283 sections:", e);
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

export async function updateStudentLabScore(
  username: string, 
  labNumber: string, 
  score: number, 
  feedback?: string, 
  sheetName: string = 'Sheet1',
  scoreType?: 'lab' | 'challenge' // For ITCS123 dual scoring
) {
  console.log(`[updateStudentLabScore] START: User=${username}, Lab=${labNumber}, Score=${score}, Subject=${sheetName}, Type=${scoreType || 'standard'}`);
  
  // For ITCS123, format the column name based on score type
  let actualLabNumber = labNumber;
  if (sheetName === 'ITCS123' && scoreType) {
    const labNumPadded = labNumber.padStart(2, '0');
    actualLabNumber = scoreType === 'lab' 
      ? `Lab${labNumPadded} (2)` 
      : `Ch${labNumPadded} (2)`;
    console.log(`[updateStudentLabScore] ITCS123 formatted column: ${actualLabNumber}`);
  } else if (sheetName === 'ITDS283' && scoreType === 'challenge') {
    // ITDS283 Challenge format: "Ch" + number (e.g. "Ch2")
    const labInt = parseInt(labNumber.toString().replace(/[^\d]/g, '')).toString();
    actualLabNumber = `Ch${labInt}`;
    console.log(`[updateStudentLabScore] ITDS283 Challenge column: ${actualLabNumber}`);
  }
  
  // Handle Multi-Section Subjects (ITCS123, ITCS223, ITDS283)
  const isMultiSection = sheetName === 'ITCS123' || sheetName === 'ITCS223' || sheetName === 'ITDS283';
  if (isMultiSection) {
       // We need to find which section the student is in.
       // We can iterate sections.
       let sections: string[] = [];
       if (sheetName === 'ITCS123') sections = ['Sec1', 'Sec2', 'Sec3'];
       else if (sheetName === 'ITCS223') sections = ['Section 1', 'Section 2', 'Section 3'];
       else if (sheetName === 'ITDS283') sections = ['Section 1', 'Section 2', 'Section1', 'Section2']; // Flexible check
       
       let foundSection = null;
       console.log(`[updateStudentLabScore] Checking sections: ${sections.join(', ')}`);

       for (const sec of sections) {
           const data = await getSheetData(sheetName, sec).catch((e) => {
               console.log(`[updateStudentLabScore] Check ignored for ${sec}: ${e.message}`);
               return [];
           });
           // Map to find user
           let idIndex = 1;
           if (sheetName === 'ITDS283' && data.length > 0) {
               const headers = data[0];
               const foundIndex = headers.findIndex((h: string) => String(h).toLowerCase().trim() === 'id');
               if (foundIndex !== -1) idIndex = foundIndex;
           }
           
           // Robust matching: Try exact, or try stripping first char if 'u'/'U'
           const exists = data.some(row => {
               const sheetId = String(row[idIndex] || '').trim();
               const inputId = String(username).trim();
               const inputIdNoU = inputId.replace(/^[uU]/, '');
               const sheetIdNoU = sheetId.replace(/^[uU]/, '');
               
               return sheetId === inputId || sheetIdNoU === inputIdNoU;
           });
           
           if (exists) {
               console.log(`[updateStudentLabScore] Found user ${username} in ${sec}`);
               foundSection = sec;
               break;
           }
       }
       
       if (foundSection) {
           return updateSpecificTab(sheetName, foundSection, username, actualLabNumber, score, feedback);
       } else {
           console.log(`[updateStudentLabScore] User ${username} NOT FOUND in any section. Defaulting to ${sections[0]}`);
           // Student not found in any section. Default to first.
           return updateSpecificTab(sheetName, sections[0], username, actualLabNumber, score, feedback);
       }
  }

  // Single Sheet Standard Logic
  console.log(`[updateStudentLabScore] Standard sheet: ${sheetName}`);
  return updateSpecificTab(sheetName, sheetName, username, actualLabNumber, score, feedback);
}

// Helper to update XLSX file directly (Download -> Modify -> Upload)
async function updateXlsxData(spreadsheetId: string, tabName: string, updates: { col: number, row: number, value: any }[]) {
    console.log(`[updateXlsxData] Fallback for XLSX Write: ${spreadsheetId}, Tab: ${tabName}, Updates: ${updates.length}`);
    try {
        const drive = await getDriveClient();
        
        // 1. Download File
        const res = await drive.files.get({
            fileId: spreadsheetId,
            alt: 'media',
        }, { responseType: 'arraybuffer' });

        // 2. Parse User's XLSX
        const buffer = Buffer.from(res.data as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        // 3. Find correct sheet
        let targetSheetName = tabName;
        if (!workbook.Sheets[targetSheetName]) {
             // Try fallback mapping similar to read
             if (workbook.Sheets['Sheet1']) targetSheetName = 'Sheet1';
             else targetSheetName = workbook.SheetNames[0];
        }
        
        const worksheet = workbook.Sheets[targetSheetName];
        if (!worksheet) throw new Error(`Sheet ${tabName} not found in XLSX file.`);
        
        // 4. Apply Updates
        const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:Z100");
        
        updates.forEach(u => {
            const cellAddress = XLSX.utils.encode_cell({ c: u.col - 1, r: u.row - 1 });
            const cell = { v: u.value, t: typeof u.value === 'number' ? 'n' : 's' };
            worksheet[cellAddress] = cell;
            
            if (u.col - 1 > range.e.c) range.e.c = u.col - 1;
            if (u.row - 1 > range.e.r) range.e.r = u.row - 1;
        });
        
        worksheet['!ref'] = XLSX.utils.encode_range(range);
        
        // 5. Write back to Buffer
        const newBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // 6. Upload (Update) File
        const { Readable } = require('stream');
        const stream = new Readable();
        stream.push(newBuffer);
        stream.push(null);

        await drive.files.update({
            fileId: spreadsheetId,
            media: {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                body: stream
            }
        });
        
        console.log("[updateXlsxData] Successfully updated XLSX file.");
        return true;

    } catch (e: any) {
        console.error(`[updateXlsxData] Failed: ${e.message}`);
        throw e;
    }
}

// Internal helper for actual update logic
async function updateSpecificTab(subject: string, tabName: string, username: string, labNumber: string, score: number, feedback?: string) {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId(subject);
  
  const rows = await getSheetData(subject, tabName);
  
  let headers = rows.length > 0 ? rows[0] : [];
  let isNewSheet = rows.length === 0;

  if (isNewSheet) {
      headers = ['Username', `Lab ${labNumber}`, `Lab ${labNumber} Feedback`];
      try {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${tabName}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values: [headers] }
        });
      } catch (e: any) {
           // If update fails on new sheet with not supported, we can't really init XLSX easily via API.
           // But updateXlsx below might handle it if we push to updates.
           // For now, ignore init error and try normal flow, fallback will catch.
      }
  }

  /* 
     Fix for Lab/Challenge matching: 
     Handle exact column name matching for ITCS123 format like "Lab01 (2)", "Ch01 (2)"
     Also support legacy formats: "Lab 1", "Lab1", "L1", etc.
     And W format for ITCS251/ITCS255: "W 1", "W 2", etc.
  */
  const labInt = parseInt(labNumber.toString().replace(/[^\d]/g, '')).toString(); // Extract just numbers: "Lab01 (2)" -> "1"
  const labNumPad = labInt.length === 1 ? `0${labInt}` : labInt; // "01"
  
  console.log(`[updateSpecificTab] Subject: ${subject}, labNumber: ${labNumber}, labInt: ${labInt}`);
  console.log(`[updateSpecificTab] Headers:`, headers);
  
  // First try exact match (for "Lab01 (2)", "Ch01 (2)")
  let labIndex = headers.findIndex((h: string) => h === labNumber);
  
  // If no exact match, try regex patterns (for legacy formats and W format)
  if (labIndex === -1) {
    // Match: Lab 1, Lab 01, Lab1, Lab01, L1, L01, Ch1, Ch01, W 1, W 2, etc.
    const labRegex = new RegExp(`^(Lab|Ch|L|W)\\s*(${labInt}|${labNumPad})(\\s*\\(.*\\))?$`, 'i');
    labIndex = headers.findIndex((h: string) => labRegex.test(h));
    console.log(`[updateSpecificTab] Regex match result: labIndex=${labIndex}`);
  }
  
  const feedbackRegex = new RegExp(`^(Lab\\s*${labInt}|L${labInt}|L${labNumPad})\\s*Feedback$`, 'i');
  let feedbackIndex = headers.findIndex((h: string) => feedbackRegex.test(h));
  
  const pendingUpdates : any[] = [];
  const xlsxUpdates : { col: number, row: number, value: any }[] = [];

  // 1. Add Header if missing
  if (labIndex === -1) {
      labIndex = headers.length; 
      // For ITCS251/ITCS255, use W format; otherwise use Lab format
      let headerValue;
      if (subject === 'ITCS251' || subject === 'ITCS255') {
        headerValue = `W ${labInt}`;
      } else {
        headerValue = labNumber.match(/^(Lab|Ch)/i) ? labNumber : `Lab ${labNumber}`;
      }
      headers.push(headerValue);
      
      // For ITCS251/ITCS255, header is at row 5, not row 1
      const headerRow = (subject === 'ITCS251' || subject === 'ITCS255') ? 5 : 1;
      
      pendingUpdates.push({
          range: `${tabName}!${getColumnLetter(labIndex + 1)}${headerRow}`,
          values: [[headerValue]]
      });
      xlsxUpdates.push({ col: labIndex + 1, row: headerRow, value: headerValue });
  }

  // 2. Find row
  const idIndex = (subject === 'ITCS123' || subject === 'ITCS223' || subject === 'ITCS251' || subject === 'ITCS255' || subject === 'ITDS283') ? 1 : 0;
  let rowIndex = rows.findIndex((row) => {
      const val = row[idIndex];
      return String(val).trim() === String(username).trim();
  });
  
  // For ITCS251/ITCS255, header starts at row 5, so we need to offset row numbers
  const startRow = (subject === 'ITCS251' || subject === 'ITCS255') ? 5 : 1;
  const rowOffset = startRow - 1; // Row 5 -> offset 4, Row 1 -> offset 0
  
  console.log(`[updateSpecificTab] rowIndex: ${rowIndex}, startRow: ${startRow}, rowOffset: ${rowOffset}`);
  
  if (rowIndex === -1) {
    rowIndex = rows.length;
    let newRow = [username];
    if (idIndex === 1) {
         newRow = [(rowIndex).toString(), username, "", ""]; 
    }
    
    const actualSheetRow = rowIndex + 1 + rowOffset;
    console.log(`[updateSpecificTab] Creating new row at sheet row ${actualSheetRow}`);
    pendingUpdates.push({
        range: `${tabName}!A${actualSheetRow}`,
        values: [newRow]
    });
    
    newRow.forEach((val, idx) => {
        xlsxUpdates.push({ col: idx + 1, row: actualSheetRow, value: val });
    });
  }

  // 3. Score Update
  const actualSheetRow = rowIndex + 1 + rowOffset;
  const scoreRange = `${tabName}!${getColumnLetter(labIndex + 1)}${actualSheetRow}`;
  console.log(`[updateSpecificTab] Score update: range=${scoreRange}, score=${score}, labIndex=${labIndex}`);
  
  pendingUpdates.push({
      range: scoreRange,
      values: [[score]]
  });
  xlsxUpdates.push({ col: labIndex + 1, row: actualSheetRow, value: score });
  
  // Special handling for ITCS251 and ITCS255: Update In-Class column adjacent to W column
  if (subject === 'ITCS251' || subject === 'ITCS255') {
    // Check if the column immediately after the lab column is "In-Class"
    const nextColumnIndex = labIndex + 1;
    if (nextColumnIndex < headers.length) {
      const nextColumnHeader = headers[nextColumnIndex];
      // Check if next column is an In-Class checkbox
      if (nextColumnHeader && String(nextColumnHeader).toLowerCase().trim() === 'in-class') {
        // Update the In-Class column adjacent to this specific W column
        pendingUpdates.push({
          range: `${tabName}!${getColumnLetter(nextColumnIndex + 1)}${actualSheetRow}`,
          values: [[true]]
        });
        xlsxUpdates.push({ col: nextColumnIndex + 1, row: actualSheetRow, value: true });
      }
    }
  }
  
  if (feedback !== undefined && feedbackIndex !== -1) {
      pendingUpdates.push({
          range: `${tabName}!${getColumnLetter(feedbackIndex + 1)}${rowIndex + 1}`,
          values: [[feedback]]
      });
      xlsxUpdates.push({ col: feedbackIndex + 1, row: rowIndex + 1, value: feedback });
  }

  // TRY SHEETS API FIRST
  try {
      if (pendingUpdates.length > 0) {
          await sheets.spreadsheets.values.batchUpdate({
              spreadsheetId,
              requestBody: {
                  valueInputOption: 'RAW',
                  data: pendingUpdates
              }
          });
      }
      return; 

  } catch (err: any) {
       const isXlsxError = err.code === 400 || (err.message && err.message.includes('not supported'));
       if (isXlsxError) {
           console.log(`[updateSpecificTab] Detected XLSX Write Error. Switching to Drive API update.`);
           return await updateXlsxData(spreadsheetId, tabName, xlsxUpdates);
       }
       throw err; 
  }
}

export async function batchUpdateScores(updates: {username: string, labNumber: string, score: number, feedback?: string, sheetName?: string}[]) {
    for (const update of updates) {
        await updateStudentLabScore(update.username, update.labNumber, update.score, update.feedback, update.sheetName);
    }
}

export async function fillMissingScores(subject: string, labNumber: string, value: string = '0', section?: string) {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId(subject);

  const isMultiSection = subject === 'ITCS123' || subject === 'ITCS223' || subject === 'ITDS283';
  const isSingleSubjectTab = subject === 'ITCS251' || subject === 'ITCS255' || subject === 'ITCS227';
  let tabs: string[] = [];
  if (isMultiSection) {
      if (subject === 'ITCS123') tabs = ['Sec1', 'Sec2', 'Sec3'];
      else if (subject === 'ITCS223') tabs = ['Section 1', 'Section 2', 'Section 3'];
      else if (subject === 'ITDS283') tabs = ['Section 1', 'Section 2'];
  } else {
      tabs = isSingleSubjectTab ? [subject] : [subject];
  } 
  
  let totalFilled = 0;
  const errors = [];

  for (const tabName of tabs) {
      try {
          const rows = await getSheetData(subject, tabName).catch(() => []);
          if (rows.length === 0) continue;

          const headers = rows[0];
          const labInt = parseInt(labNumber.toString()).toString();
          const labNumPad = labInt.length === 1 ? `0${labInt}` : labInt;
          const labRegex = new RegExp(`^(Lab\\s*${labInt}|L${labInt}|L${labNumPad})(\\s*\\(.*\\))?$`, 'i');
          let labIndex = headers.findIndex((h: string) => labRegex.test(h));

          if (labIndex === -1) continue;

          const updates = [];
          const xlsxUpdates: any[] = [];

          // For ITCS227, filter by section (column F = index 5)
          const sectionIndex = subject === 'ITCS227' ? 5 : -1;
          // For ITCS251/ITCS255, header starts at row 5 (already handled by getSheetData)
          const headerRowOffset = (subject === 'ITCS251' || subject === 'ITCS255') ? 4 : 0;

          for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              
              // If section filtering is enabled for ITCS227, check section match
              if (subject === 'ITCS227' && section && sectionIndex !== -1) {
                  const rowSection = String(row[sectionIndex] || '').trim();
                  if (rowSection !== section) {
                      continue; // Skip rows not in selected section
                  }
              }
              
              const cellValue = row[labIndex];

              if (cellValue === undefined || cellValue === null || cellValue === '') {
                  // Adjust row number for subjects with header offset
                  const actualRow = i + 1 + headerRowOffset;
                  updates.push({
                      range: `${tabName}!${getColumnLetter(labIndex + 1)}${actualRow}`,
                      values: [[value]]
                  });
                  xlsxUpdates.push({ col: labIndex + 1, row: actualRow, value: value });
              }
          }

          if (updates.length > 0) {
              try {
                  await sheets.spreadsheets.values.batchUpdate({
                      spreadsheetId,
                      requestBody: {
                          valueInputOption: 'RAW',
                          data: updates
                      }
                  });
              } catch (err: any) {
                   const isXlsxError = err.code === 400 || (err.message && err.message.includes('not supported'));
                   if (isXlsxError) {
                       console.log(`[fillMissingScores] XLSX Write Fallback for ${tabName}`);
                       await updateXlsxData(spreadsheetId, tabName, xlsxUpdates);
                   } else {
                       throw err;
                   }
              }
              totalFilled += updates.length;
          }
      } catch (e: any) {
          errors.push(`${tabName}: ${e.message}`);
      }
  }

  if (errors.length > 0) {
      return { success: false, message: `Completed with errors: ${errors.join(', ')}` };
  }

  const sectionMsg = (subject === 'ITCS227' && section) ? ` in Section ${section}` : '';
  return { success: true, message: `Filled ${totalFilled} missing scores with '${value}'${sectionMsg} across ${tabs.length} tab(s).`, count: totalFilled };
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
