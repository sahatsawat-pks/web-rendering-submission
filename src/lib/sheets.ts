import { google } from 'googleapis';

// Google Sheets API authentication (credentials still from environment)

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')!;

// Helper to get Google Sheets ID from database
async function getSubjectSheetId(subject: string): Promise<string> {
    try {
        const { getSubjects } = await import("./db");
        const subjects = await getSubjects(); 
        const target = subjects.find(s => s.code === subject);
        
        if (target && target.googleSheetId) {
            return target.googleSheetId;
        }
    } catch (e) {
        console.error(`[getSubjectSheetId] DB lookup failed for ${subject}:`, e);
    }

    // No fallback - Sheet ID must be configured in database via Admin UI
    throw new Error(
        `Google Sheets ID not configured for subject: ${subject}. ` +
        `Please configure it in the Admin UI at /admin/subjects`
    );
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
    // console.log(`[getXlsxData] Fallback for XLSX: ${spreadsheetId}, Tab: ${tabName}`);
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
                     // console.log(`[getXlsxData] Tab '${tabName}' not found, trying 'Sheet1' fallback.`);
                     targetSheet = 'Sheet1';
                 } else {
                     // Last resort: First sheet
                     // console.log(`[getXlsxData] Tab '${tabName}' not found, using first sheet '${workbook.SheetNames[0]}'.`);
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
  const spreadsheetId = await getSubjectSheetId(subject);
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
          // console.log(`[getSheetData] Detected potential XLSX file (Error ${err.code}), attempting fallback.`);
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

// Helper to get full subject config
async function getSubjectConfig(subjectCode: string) {
    try {
        const { getSubjects } = await import("./db");
        const subjects = await getSubjects();
        const target = subjects.find(s => s.code === subjectCode);
        return target;
    } catch (e) {
        console.error(`[getSubjectConfig] Failed to fetch config for ${subjectCode}`, e);
        return undefined;
    }
}

// Helper to map raw rows to student objects
function mapRowsToStudents(rows: any[][], subject: string, config?: any): any[] {
  if (rows.length === 0) return [];

  // Determine header row index (0-based)
  // config.headerRow is 1-based (default 1)
  const headerRowIndex = (config?.headerRow || 1) - 1;
  
  // Safety check
  if (headerRowIndex >= rows.length) return [];

  const headers = rows[headerRowIndex];
  const data = rows.slice(headerRowIndex + 1);
  
  // Determine ID Column Index
  // Default logic: ITCS123/223/251/255/ITDS283 -> Index 1 (Col B)
  // Others -> Index 0 (Col A)
  // We can make this configurable later, but for now stick to patterns + overrides
  let idIndex = (subject === 'ITCS123' || subject === 'ITCS223' || subject === 'ITCS251' || subject === 'ITCS255' || subject === 'ITDS283') ? 1 : 0;
  
  // ITDS283 Dynamic Search
  if (subject === 'ITDS283') {
      const foundIndex = headers.findIndex((h: string) => String(h).toLowerCase().trim() === 'id');
      if (foundIndex !== -1) idIndex = foundIndex;
  }

  // Regex for Custom Pattern
  let customRegex: RegExp | null = null;
  if (config?.columnPattern) {
      try {
          // User provides pattern like "^Lab\s*{labId}"
          // We prefer they provide valid Regex string. 
          // If they use {labId}, we prepare to match it dynamically? 
          // Actually, mapRows iterates headers to FIND what they are.
          // So we need a Regex that captures the Lab ID.
          // Example pattern: "^Lab\s*(\d+)"
          // If user puts "{labId}", we replace it with "(\d+)" for capturing.
          const patternStr = config.columnPattern.replace('{labId}', '(\\d+)').replace('{questionId}', '(\\w+)');
          customRegex = new RegExp(patternStr, 'i');
      } catch (e) {
          console.error(`[mapRows] Invalid Regex Pattern for ${subject}: ${config.columnPattern}`);
      }
  }

  return data.map((row) => {
    const rawUsername = row[idIndex];
    const student: any = { username: rawUsername ? String(rawUsername).trim() : "" };
    
    // ... [Existing Name Mapping Logic preserved for legacy/specific subjects] ...
    if (subject === 'ITCS123') {
        student['name'] = fixMashedName(row[3]);
        student['surname'] = fixMashedName(row[4]);
        student['nickname'] = row[5];
    } else if (subject === 'ITCS223') {
        student['name'] = fixMashedName(row[2]);
        student['surname'] = fixMashedName(row[3]);
    } else if (subject === 'ITCS227') {
        student['Section'] = row[5]; 
    } else if (subject === 'ITDS283') {
        student['title'] = row[2];
        student['name'] = fixMashedName(row[3]);
        student['surname'] = fixMashedName(row[4]);
        student['nickname'] = row[5];
        student['engName'] = fixMashedName(row[6]);
        student['nicknameEng'] = row[9];
        student['email'] = row[10];
    }
    
    let lastLabNumber: string | null = null;

    headers.slice(idIndex + 1).forEach((header: string, relativeIndex: number) => {
         const trueIndex = idIndex + 1 + relativeIndex;
         const cellValue = row[trueIndex];
         if (!header) return;

         // 1. Custom Regex Match
         if (customRegex) {
             const match = String(header).match(customRegex);
             if (match && match[1]) {
                 // Store with original header format to maintain consistency
                 // This ensures "l1-q1" stays as "l1-q1" instead of becoming "Lab 1 q1"
                 student[header] = cellValue;
                 
                 // Extract lab number for potential in-class tracking
                 lastLabNumber = match[1];
                 return;
             }
         }

        // 2. Legacy/Hardcoded Matchers
        const wMatch = header.match(/^W\s*(\d+)$/i);
        const match = header.match(/^(?:Lab\s*|L)(\d+)(?:\s*\(.*\))?$/i);
        const chMatch = header.match(/^(?:Ch\s*|Challenge\s*)(\d+)(?:\s*\(.*\))?$/i);
        
        if (wMatch) {
            const labNum = parseInt(wMatch[1]).toString();
            student[`Lab ${labNum}`] = cellValue;
            lastLabNumber = labNum;
        } else if (match) {
            const labNum = parseInt(match[1]).toString(); 
            student[`Lab ${labNum}`] = cellValue;
            lastLabNumber = labNum;
        } else if (chMatch) {
            const chNum = parseInt(chMatch[1]).toString();
            student[`Challenge ${chNum}`] = cellValue;
            lastLabNumber = null; 
        } else if (header.match(/^l(\d+)-q(\d+)$/i)) {
             // Support for l1-q1 format
             student[header] = cellValue;
             // Also optionally map to Lab X if needed, but keeping original key is safer for now
        } else if (header.match(/Feedback/i)) {
             student[header] = cellValue;
        } else if (header.match(/^\s*(name|firstname)\s*$/i)) {
             if (!student['name']) student['name'] = fixMashedName(cellValue);
        } else if (header.match(/^\s*(surname|lastname)\s*$/i)) {
             if (!student['surname']) student['surname'] = fixMashedName(cellValue);
        } else if (header.match(/^\s*(Sum|Total)(?:\s*\((\d+)\))?\s*$/i)) {
             student['total'] = cellValue;
             const match = header.match(/\((\d+)\)/);
             if (match) student['max_score'] = match[1];
        } else if (String(header).toLowerCase().trim() === 'in-class') {
             if (lastLabNumber) {
                 student[`In-Class ${lastLabNumber}`] = cellValue;
             }
             student[header] = cellValue; 
        } else {
             student[header] = cellValue;
        }
    });
    
    // ITCS223 Specific Calculation
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

// Main Score Fetching Logic
export async function getAllScores(subject: string = 'Sheet1') {
  const config = await getSubjectConfig(subject);
  
  // Strategy: Tab per Lab (New)
  if (config?.dataSourceType === 'tab_per_lab') {
      const { getAllLabs } = await import("./db");
      const labs = await getAllLabs(true, subject);
      
      // We need a list of students first. Where do we get it?
      // Usually there is a 'Roster' tab or we just aggregate from all tabs.
      // Or we assume the first lab tab has the full roster.
      // Let's try to fetch from all specific Lab Tabs.
      // If user provided `sheetTabs`, use that as a roster source priority?
      // Or just iterate active labs.
      
      let allStudentsMap: Record<string, any> = {};
      
      // Fetch each lab tab
      for (const lab of labs) {
          const tabName = `Lab ${lab.labNumber}`; // Default pattern, maybe user customizes?
          // If we had a custom tab pattern, we'd use it. For now assume "Lab X".
          // Or if sheetTabs is provided as a list of Labs? "Lab 1, Lab 2"
          
          try {
              const rows = await getSheetData(subject, tabName).catch(() => []);
              if (rows.length === 0) continue;
              
              const labStudents = mapRowsToStudents(rows, subject, config);
              
              labStudents.forEach(s => {
                  if (!s.username) return;
                  if (!allStudentsMap[s.username]) {
                      allStudentsMap[s.username] = { ...s }; // Init
                  } else {
                      // Merge scores
                      allStudentsMap[s.username] = { ...allStudentsMap[s.username], ...s };
                  }
              });
          } catch(e) {
              // console.log(`[getAllScores] Failed to fetch tab ${tabName}`);
          }
      }
      
      return Object.values(allStudentsMap);
  }

  // Strategy: Tab per Section
  const isMultiSection = (config?.dataSourceType === 'tab_per_section') || 
                         (subject === 'ITCS123' || subject === 'ITCS223' || subject === 'ITDS283');
                         
  if (isMultiSection) {
      let tabs: string[] = [];
      
      // Use configured tabs if available
      if (config?.sheetTabs) {
          tabs = config.sheetTabs.split(',').map(t => t.trim());
      } else {
          // Fallback legacy defaults
          if (subject === 'ITCS123') tabs = ['Sec1', 'Sec2', 'Sec3'];
          else if (subject === 'ITCS223') tabs = ['Section 1', 'Section 2', 'Section 3'];
          else if (subject === 'ITDS283') tabs = ['Section 1', 'Section 2'];
          else tabs = ['Sec1', 'Sec2']; // Generic default
      }

      // console.log(`[getAllScores] Fetching multi-section: ${tabs.join(', ')}`);
      
      const promises = tabs.map(tab => getSheetData(subject, tab).catch(e => {
          console.warn(`[getAllScores] Failed to fetch ${tab}: ${e.message}`);
          return [];
      }));
      
      const results = await Promise.all(promises);
      let allStudents: any[] = [];
      
      results.forEach((rows, i) => {
          if (rows.length > 0) {
              const studs = mapRowsToStudents(rows, subject, config);
              const tabName = tabs[i];
              // extract section ID from tab name? "Section 1" -> "1"
              const secMatch = tabName.match(/\d+/);
              const secId = secMatch ? secMatch[0] : tabName;
              
              studs.forEach(s => s.Section = secId);
              allStudents = [...allStudents, ...studs];
          }
      });
      
      return allStudents;
  }

  // Default: Single Sheet
  const rows = await getSheetData(subject);
  return mapRowsToStudents(rows, subject, config);
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
  scoreType?: 'lab' | 'challenge', // For ITCS123 dual scoring
  isCsv: boolean = false
) {
  // console.log(`[updateStudentLabScore] START: User=${username}, Lab=${labNumber}, Score=${score}, Subject=${sheetName}`);
  
  const config = await getSubjectConfig(sheetName);
  
  // Format Lab Number / Column Name
  let actualLabNumber = labNumber;
  
  // 1. Check if user configured a pattern that needs interpolation
  if (config?.columnPattern && config.columnPattern.includes('{labId}')) {
      // If we are passing "1", and pattern is "Lab {labId}", result "Lab 1"
      // BUT `updateSpecificTab` also does regex watching.
      // If dynamic, we usually want to search by Header matching rather than guessing exact string
      // But we can try to guess a "Standard" display name.
      const labInt = parseInt(labNumber.replace(/[^\d]/g, '')) || labNumber;
      // If it's multi-question (e.g. L1-Q1), we might receive "L1-Q1" as labNumber.
      // If the pattern is "Lab {labId}", it won't suffice for question sub-parts unless pattern supports it.
      // We assume `labNumber` passed here IS the column header identifier or close to it.
  }
  
  // Legacy ITCS123 handling
  if (sheetName === 'ITCS123' && scoreType) {
    const labNumPadded = labNumber.padStart(2, '0');
    actualLabNumber = scoreType === 'lab' ? `Lab${labNumPadded} (2)` : `Ch${labNumPadded} (2)`;
  } else if (sheetName === 'ITDS283' && scoreType === 'challenge') {
    const labInt = parseInt(labNumber.toString().replace(/[^\d]/g, '')).toString();
    actualLabNumber = `Ch${labInt}`;
  }

  // Determine Target Tabs
  let targetTabs: string[] = [sheetName];
  
  // Strategy: Tab Per Lab
  if (config?.dataSourceType === 'tab_per_lab') {
      // The tab name should be "Lab X" corresponding to the lab number.
      // We need to know which lab we are grading. 
      // If `labNumber` is "1", tab is "Lab 1".
      // If `labNumber` is "L1-Q1", tab is still "Lab 1".
      const labInt = parseInt(labNumber.replace(/[^\d]/g, ''));
      if (!isNaN(labInt)) {
          targetTabs = [`Lab ${labInt}`];
          // User might have "Lab 01". We might need to try multiple?
          // `updateSpecificTab` fails if tab doesn't exist?
          // We can check existence or try fallback inside updateSpecificTab logic (not implemented there yet)
          // For now assume "Lab X" format.
      }
  }
  // Strategy: Tab Per Section (Multi-Sheet)
  else if (config?.dataSourceType === 'tab_per_section' || 
           ['ITCS123', 'ITCS223', 'ITDS283'].includes(sheetName)) {
      
      if (config?.sheetTabs) {
          targetTabs = config.sheetTabs.split(',').map(t => t.trim());
      } else {
          // Fallback
          if (sheetName === 'ITCS123') targetTabs = ['Sec1', 'Sec2', 'Sec3'];
          else if (sheetName === 'ITCS223') targetTabs = ['Section 1', 'Section 2', 'Section 3'];
          else if (sheetName === 'ITDS283') targetTabs = ['Section 1', 'Section 2'];
          else targetTabs = ['Sec1', 'Sec2'];
      }
  }

  // Iterate tabs to find student
  let foundAndUpdate = false;
  
  for (const tab of targetTabs) {
       // console.log(`[updateStudentLabScore] Checking tab: ${tab}`);
       // We need to check if student exists in this tab before creating new row (unless it's single sheet and we want to create)
       // Optimization: `updateSpecificTab` handles "Find row". 
       // But for multi-section, we only want to update ONE tab where the student IS.
       
       const isMultiTab = targetTabs.length > 1;
       
       if (isMultiTab) {
           const rows = await getSheetData(sheetName, tab).catch(() => []);
           if (rows.length === 0) continue;
           
           // Check existence
           const headerRowConfig = config?.headerRow ? config.headerRow - 1 : 0;
           // ID col defaults
           let idIndex = ['ITCS123','ITCS223','ITCS251','ITCS255','ITDS283'].includes(sheetName) ? 1 : 0;
           if (sheetName === 'ITDS283' && rows.length > headerRowConfig) {
                const h = rows[headerRowConfig];
                const found = h.findIndex((x: any) => String(x).toLowerCase().trim() === 'id');
                if (found !== -1) idIndex = found;
           }
           
           const exists = rows.some((row, idx) => {
               if (idx <= headerRowConfig) return false;
               const sheetId = String(row[idIndex] || '').trim();
               const inputId = String(username).trim();
               return sheetId === inputId || sheetId.replace(/^[uU]/,'') === inputId.replace(/^[uU]/,'');
           });
           
           if (exists) {
               // console.log(`[updateStudentLabScore] Found user in ${tab}`);
               await updateSpecificTab(sheetName, tab, username, actualLabNumber, score, feedback, isCsv, config);
               foundAndUpdate = true;
               break; 
           }
       } else {
           // Single target (Standard or Specific Lab Tab) - Allow creation or update
           await updateSpecificTab(sheetName, tab, username, actualLabNumber, score, feedback, isCsv, config);
           foundAndUpdate = true;
       }
  }
  
  if (!foundAndUpdate && targetTabs.length > 1) {
      // Default to first tab if not found?
      // console.log(`[updateStudentLabScore] User not found in any section tab. Defaulting to ${targetTabs[0]}`);
      await updateSpecificTab(sheetName, targetTabs[0], username, actualLabNumber, score, feedback, isCsv, config);
  }
}

// Helper to update XLSX file directly (Download -> Modify -> Upload)
async function updateXlsxData(spreadsheetId: string, tabName: string, updates: { col: number, row: number, value: any }[]) {
    // console.log(`[updateXlsxData] Fallback for XLSX Write: ${spreadsheetId}, Tab: ${tabName}, Updates: ${updates.length}`);
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
        
        // console.log("[updateXlsxData] Successfully updated XLSX file.");
        return true;

    } catch (e: any) {
        console.error(`[updateXlsxData] Failed: ${e.message}`);
        throw e;
    }
}

// Internal helper for actual update logic
async function updateSpecificTab(subject: string, tabName: string, username: string, labNumber: string, score: number, feedback?: string, isCsv: boolean = false, config?: any) {
  const sheets = await getSheetsClient();
  const spreadsheetId = await getSubjectSheetId(subject);
  
  const rows = await getSheetData(subject, tabName);
  
  // Header Config
  const headerRow = config?.headerRow || (subject === 'ITCS251' || subject === 'ITCS255' ? 5 : 1);
  const headerIdx = headerRow - 1;

  let headers = rows.length > headerIdx ? rows[headerIdx] : [];
  
  // ... [Existing init logic if empty sheet, but using headerRow] ...
  if (rows.length === 0) {
      // Create Sheet with header at correct row?
      // Complicated if headerRow > 1. Assume 1 for empty.
      headers = ['Username', `Lab ${labNumber}`, `Lab ${labNumber} Feedback`];
      // Update...
  }

  // Column Matching Logic
  const labInt = parseInt(labNumber.toString().replace(/[^\d]/g, '')).toString(); 
  const labNumPad = labInt.length === 1 ? `0${labInt}` : labInt;
  
  // console.log(`[updateSpecificTab] Finding column for: ${labNumber} (Int: ${labInt})`);
  
  // 1. Exact Match
  let labIndex = headers.findIndex((h: string) => h === labNumber);
  
  if (labIndex === -1) {
      labIndex = headers.findIndex((h: string) => h.toLowerCase() === labNumber.toLowerCase());
  }
  
  // 2. Regex Match (Enhanced)
  if (labIndex === -1) {
      if (config?.columnPattern) {
           const safePattern = config.columnPattern.replace('{labId}', `(${labInt}|${labNumPad})`).replace('{questionId}', '.*');
           try {
               const regex = new RegExp(safePattern, 'i');
               labIndex = headers.findIndex((h: string) => regex.test(h));
           } catch (e) {}
      }
      
      if (labIndex === -1) {
          // Standard Fallbacks
          const labRegex = new RegExp(`^(Lab|Ch|L|W)\\s*(${labInt}|${labNumPad})\\b`, 'i');
          labIndex = headers.findIndex((h: string) => labRegex.test(h));
      }
  }
  
  // Feedback Column
  // Usually adjacent or named specifically
  let feedbackIndex = headers.findIndex((h: string) => h === `${labNumber} Feedback` || h === `Lab ${labInt} Feedback`);
  
  const pendingUpdates : any[] = [];
  const xlsxUpdates : { col: number, row: number, value: any }[] = [];

  // Add Header if missing
  if (labIndex === -1) {
      labIndex = headers.length; 
      let headerValue = labNumber; 
      // If we need to respect pattern for creation, it's hard. Just use passed Value.
      headers.push(headerValue);
      
      pendingUpdates.push({
          range: `${tabName}!${getColumnLetter(labIndex + 1)}${headerRow}`,
          values: [[headerValue]]
      });
      xlsxUpdates.push({ col: labIndex + 1, row: headerRow, value: headerValue });
  }

  // Find Row
  // Use same ID logic as mapRows
  let idIndex = ['ITCS123','ITCS223','ITCS251','ITCS255','ITDS283'].includes(subject) ? 1 : 0;
  if (subject === 'ITDS283') {
       const found = headers.findIndex((h: string) => String(h).toLowerCase().trim() === 'id');
       if (found !== -1) idIndex = found;
  }

  let rowIndex = rows.findIndex((row, idx) => {
      if (idx < headerIdx) return false; // Skip pre-header
      const val = row[idIndex];
      return String(val).trim() === String(username).trim();
  });
  
  if (rowIndex === -1) {
    rowIndex = rows.length;
    let newRow = new Array(Math.max(idIndex + 1, headers.length)).fill("");
    newRow[idIndex] = username;
    
    // The `rows` array returned by `getSheetData` is already adjusted for `startRow`.
    // So if `rows[0]` is the first data row (after headers), then `rowIndex` is 0-indexed relative to that.
    // The actual sheet row number is `rowIndex` + `headerRow` + 1 (since `headerRow` is 1-indexed).
    // If `headerRow` is 1, then `rows[0]` is the header, `rows[1]` is the first data row.
    // If `headerRow` is 5, then `rows[0]` is the header, `rows[1]` is the first data row.
    // This means `rowIndex` is 0-indexed relative to the first data row.
    // So, `actualSheetRow` for a new row should be `rows.length` (which is the next available index in `rows`) + `headerRow`.
    const actualSheetRow = rows.length + headerRow;
    
    pendingUpdates.push({
        range: `${tabName}!A${actualSheetRow}`,
        values: [newRow]
    });
    newRow.forEach((val, idx) => {
        xlsxUpdates.push({ col: idx + 1, row: actualSheetRow, value: val });
    });
  }

  // Score Update
  // We need precise row number.
  // if rowIndex is from `rows` (which starts at `startRow`), then:
  // Sheet Row = rowIndex + startRow.
  // The `rows` array returned by `getSheetData` is already adjusted for `startRow`.
  // So if `rows[0]` is the header row (at `headerRow`), then `rows[1]` is the first data row.
  // `rowIndex` is 0-indexed relative to the first data row.
  // So, the actual sheet row number is `rowIndex` + `headerRow` + 1.
  const actualSheetRow = rowIndex + headerRow;

  const scoreRange = `${tabName}!${getColumnLetter(labIndex + 1)}${actualSheetRow}`;
  // console.log(`[updateSpecificTab] Score update: range=${scoreRange}, score=${score}`);
  
  pendingUpdates.push({
      range: scoreRange,
      values: [[score]]
  });
  xlsxUpdates.push({ col: labIndex + 1, row: actualSheetRow, value: score });
  
  // Special handling for ITCS251 and ITCS255: Update In-Class column adjacent to W column
  // Skip if initiated via CSV upload
  if ((subject === 'ITCS251' || subject === 'ITCS255') && !isCsv) {
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
  
  // Feedback
  if (feedback !== undefined && feedbackIndex !== -1) {
      pendingUpdates.push({
          range: `${tabName}!${getColumnLetter(feedbackIndex + 1)}${actualSheetRow}`,
          values: [[feedback]]
      });
      xlsxUpdates.push({ col: feedbackIndex + 1, row: actualSheetRow, value: feedback });
  }

  // Exec Updates (same as before)
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
           // console.log(`[updateSpecificTab] Detected XLSX Write Error. Switching to Drive API update.`);
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
  const spreadsheetId = await getSubjectSheetId(subject);

  const isMultiSection = subject === 'ITCS123' || subject === 'ITCS223' || subject === 'ITDS283';
  const isSingleSubjectTab = subject === 'ITCS251' || subject === 'ITCS255' || subject === 'ITCS227';
  let tabs: string[] = [];
  if (isMultiSection) {
      let allTabs: string[] = [];
      if (subject === 'ITCS123') allTabs = ['Sec1', 'Sec2', 'Sec3'];
      else if (subject === 'ITCS223') allTabs = ['Section 1', 'Section 2', 'Section 3'];
      else if (subject === 'ITDS283') allTabs = ['Section 1', 'Section 2'];

      if (section && section !== 'all') {
         const target = allTabs.find(t => t.includes(section) || t.endsWith(section));
         tabs = target ? [target] : allTabs;
      } else {
         tabs = allTabs;
      }
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
              if (subject === 'ITCS227' && section && section !== 'all' && sectionIndex !== -1) {
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
                       // console.log(`[fillMissingScores] XLSX Write Fallback for ${tabName}`);
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
