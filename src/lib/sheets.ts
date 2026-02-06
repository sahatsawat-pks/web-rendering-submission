import { google } from 'googleapis';

// Google Sheets API authentication (credentials still from environment)

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')!;

// Local cache for subjects to avoid redundant DB lookups
let cachedSubjects: any[] | null = null;
let subjectsCacheTimestamp = 0;
const SUBJECTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getCachedSubjects() {
    if (cachedSubjects && (Date.now() - subjectsCacheTimestamp < SUBJECTS_CACHE_TTL)) {
        return cachedSubjects;
    }
    try {
        const { getSubjects } = await import("./db");
        cachedSubjects = await getSubjects();
        subjectsCacheTimestamp = Date.now();
        return cachedSubjects;
    } catch (e) {
        // console.error("[getCachedSubjects] Failed to fetch subjects:", e);
        return cachedSubjects || []; // Return stale data if fetch fails
    }
}

// Helper function to clear the subjects cache
export function clearSubjectsCache() {
    cachedSubjects = null;
    subjectsCacheTimestamp = 0;
}

// Helper function to clear the sheets data cache
export function clearSheetsCache(subject?: string) {
    if (subject) {
        // Clear cache for specific subject
        for (const key of sheetsCache.keys()) {
            if (key.includes(`_${subject}_`) || key.includes(`_${subject}`)) {
                sheetsCache.delete(key);
            }
        }
        // Also clear student row cache for this subject
        for (const key of studentRowCache.keys()) {
            if (key.includes(subject)) {
                studentRowCache.delete(key);
            }
        }
    } else {
        // Clear all sheets cache
        sheetsCache.clear();
        studentRowCache.clear();
    }
}

// Helper to get Google Sheets ID from database
async function getSubjectSheetId(subject: string): Promise<string> {
    let subjects = await getCachedSubjects(); 
    // console.log(`[getSubjectSheetId] Looking for subject: "${subject}"`);
    // console.log(`[getSubjectSheetId] Available subjects:`, subjects.map(s => ({ 
    //     code: s.code, 
    //     hasGoogleSheetId: !!s.googleSheetId, 
    //     googleSheetId: s.googleSheetId ? s.googleSheetId.substring(0, 20) + '...' : 'null' 
    // })));
    
    let target = subjects.find(s => s.code === subject);
    
    if (target && target.googleSheetId) {
        // console.log(`[getSubjectSheetId] Found sheet ID for ${subject}: ${target.googleSheetId}`);
        return target.googleSheetId;
    }

    if (target && !target.googleSheetId) {
        // console.log(`[getSubjectSheetId] Subject ${subject} found but no googleSheetId set, clearing cache and retrying...`);
        // Clear cache and try one more time
        clearSubjectsCache();
        subjects = await getCachedSubjects();
        target = subjects.find(s => s.code === subject);
        
        if (target && target.googleSheetId) {
            // console.log(`[getSubjectSheetId] After cache clear, found sheet ID for ${subject}: ${target.googleSheetId}`);
            return target.googleSheetId;
        }
    } else {
        // console.log(`[getSubjectSheetId] Subject ${subject} not found in database, clearing cache and retrying...`);
        // Clear cache and try one more time
        clearSubjectsCache();
        subjects = await getCachedSubjects();
        target = subjects.find(s => s.code === subject);
        
        if (target && target.googleSheetId) {
            // console.log(`[getSubjectSheetId] After cache clear, found sheet ID for ${subject}: ${target.googleSheetId}`);
            return target.googleSheetId;
        }
    }

    // Final detailed error
    // console.log(`[getSubjectSheetId] Final error - Subject: ${subject}, Found: ${!!target}, HasSheetId: ${target ? !!target.googleSheetId : 'N/A'}`);
    
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
        'https://www.googleapis.com/auth/drive',
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

// Simple in-memory cache for Google Sheets data
interface CacheEntry {
    data: any[][];
    timestamp: number;
}
const sheetsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache (increased for better performance)

async function getXlsxData(spreadsheetId: string, tabName: string) {
    const cacheKey = `xlsx_${spreadsheetId}_${tabName}`;
    const cached = sheetsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    try {
        const drive = await getDriveClient();
        const res = await drive.files.get({
            fileId: spreadsheetId,
            alt: 'media',
        }, { responseType: 'arraybuffer' });

        const buffer = Buffer.from(res.data as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        let targetSheet = tabName;
        if (!workbook.Sheets[targetSheet]) {
            if (workbook.SheetNames.length > 0) {
                 if (workbook.Sheets['Sheet1']) {
                     targetSheet = 'Sheet1';
                 } else {
                     targetSheet = workbook.SheetNames[0];
                 }
            }
        }

        const worksheet = workbook.Sheets[targetSheet];
        if (!worksheet) return [];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Cache the result
        sheetsCache.set(cacheKey, { data: jsonData, timestamp: Date.now() });
        return jsonData;

    } catch (e: any) {
        // console.error(`[getXlsxData] Failed to parse XLSX: ${e.message}`);
        return [];
    }
}

export async function getSheetData(subject: string = 'Sheet1', tabName?: string, bypassCache: boolean = false) {
  const spreadsheetId = await getSubjectSheetId(subject);

  // Removed ITCS113 special block to default to starting from 'A' and using 'Sheet1' or subject name fallback
  let firstRow = 'A';

  if (subject === 'ITCS113') {
    tabName = 'lab';
  }

  const targetTab = tabName || subject;
  
  const cacheKey = `sheets_${spreadsheetId}_${targetTab}`;
  const cached = sheetsCache.get(cacheKey);
  if (!bypassCache && cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data;
  }

  const sheets = await getSheetsClient();
  // For ITCS251 and ITCS255, header starts at row 5
  const startRow = (subject === 'ITCS251' || subject === 'ITCS255') ? 5 : 1;
  const range = `${targetTab}!${firstRow}${startRow}:ZZ1000`;

  try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      const data = response.data.values || [];
      
      // Cache the result
      sheetsCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
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
        const subjects = await getCachedSubjects();
        const target = subjects.find(s => s.code === subjectCode);
        return target;
    } catch (e) {
        // console.error(`[getSubjectConfig] Failed to fetch config for ${subjectCode}`, e);
        return undefined;
    }
}

// Helper to map raw rows to student objects
function mapRowsToStudents(rows: any[][], subject: string, config?: any): any[] {
  if (rows.length === 0) return [];

  // Determine header row index (0-based)
  // All subjects use config or default to row 1
  const headerRowIndex = (config?.headerRow || 1) - 1;
  
  // Safety check
  if (headerRowIndex >= rows.length) return [];

  const headers = rows[headerRowIndex];
  
  const data = rows.slice(headerRowIndex + 1);
  
  // Determine ID Column Index
  // Default logic: ITCS123/223/251/255/ITDS283/ITCS113/ITCS258 -> Index 1 (Col B)
  // Criteria-based subjects (with Ethics, Code Understanding, Reflection columns) -> Index 1 (Col B)
  // Others -> Index 0 (Col A)
  // We can make this configurable later, but for now stick to patterns + overrides
  let idIndex = (subject === 'ITCS123' || subject === 'ITCS223' || subject === 'ITCS251' || subject === 'ITCS255' || subject === 'ITDS283' || subject === 'ITCS113' || subject === 'ITCS258') ? 1 : 0;
  
  // Check for criteria-based format (Ethics, Code Understanding, Reflection columns)
  const isCriteriaBasedFormat = headers.some((h: string) => 
    String(h).toLowerCase().includes('ethics') || 
    String(h).toLowerCase().includes('code understanding') || 
    String(h).toLowerCase().includes('reflection')
  );
  if (isCriteriaBasedFormat) {
    idIndex = 1; // ID is in column B for criteria format
  }
  
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
        //   console.error(`[mapRows] Invalid Regex Pattern for ${subject}: ${config.columnPattern}`);
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
    } else if (subject === 'ITCS251' || subject === 'ITCS255') {
        // ITCS251 and ITCS255 have similar structure with header starting at row 5
        // Based on the data structure, names appear to be in specific columns
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
    } else if (isCriteriaBasedFormat) {
        // For criteria-based format, discover columns dynamically from headers
        // Don't hardcode indices as different tabs may have different structures
        student['name'] = fixMashedName(row[2]);
        student['surname'] = fixMashedName(row[3]);
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
        const wMatch = header.match(/^(?:W|Week)\s*(\d+)/i);
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
        } else if (header === 'Ethics' || header === 'Code Understanding' || header === 'Reflection') {
             // For tab-per-lab subjects, prefix with lab number
             if (config?.currentLabNumber) {
               const labKey = `Lab ${config.currentLabNumber} ${header}`;
               student[labKey] = cellValue;
             } else {
               // Single sheet: use plain column name
               student[header] = cellValue;
             }
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
export async function getAllScores(subject: string = 'Sheet1', bypassCache: boolean = false) {
  const config = await getSubjectConfig(subject);
  
  // Strategy: Tab per Lab (New)
  if (config?.dataSourceType === 'tab_per_lab') {
      let labTabs: string[] = [];
      
      try {
        // First try to use configured tabs if available
        if (config?.sheetTabs) {
          labTabs = config.sheetTabs.split(',').map((t: string) => t.trim());
        } else if (config?.tabPattern) {
          // Use configured tab pattern with lab numbers from database
          const { getAllLabs } = await import("./db");
          const labs = await getAllLabs(true, subject);
          
          labTabs = labs.map(lab => {
            const labNum = parseInt(lab.labNumber);
            return config.tabPattern.replace('{labId}', labNum.toString());
          });
        } else {
          // Try to get spreadsheet info to scan for lab tabs
          const sheets = await getSheetsClient();
          const spreadsheetId = await getSubjectSheetId(subject);
          const spreadsheetInfo = await sheets.spreadsheets.get({
            spreadsheetId
          });
          
          const allSheets = spreadsheetInfo.data.sheets || [];
          
          // Find lab tabs using regex pattern: lab1, lab2, Lab 1, Lab 2, etc.
          const labTabRegex = /^lab\s*\d+$/i;
          labTabs = allSheets
            .map(sheet => sheet.properties?.title || '')
            .filter(name => labTabRegex.test(name))
            .sort((a, b) => {
              // Sort by lab number
              const aNum = parseInt(a.replace(/\D/g, '')) || 0;
              const bNum = parseInt(b.replace(/\D/g, '')) || 0;
              return aNum - bNum;
            });
        }
      } catch (error: any) {
        // console.warn(`[getAllScores] Cannot access spreadsheet info for ${subject}, using fallback:`, error.message);
        
        // Fallback: try common lab tab patterns
        const { getAllLabs } = await import("./db");
        const labs = await getAllLabs(true, subject);
        
        if (labs.length > 0) {
          // Try different naming patterns: Lab1, Lab 1, lab1
          const patterns = [
            (num: number) => `Lab${num}`,      // Lab1, Lab2, Lab3
            (num: number) => `Lab ${num}`,     // Lab 1, Lab 2, Lab 3
            (num: number) => `lab${num}`,      // lab1, lab2, lab3
            (num: number) => `lab ${num}`,     // lab 1, lab 2, lab 3
          ];
          
          labTabs = [];
          for (const pattern of patterns) {
            labTabs = labs.map(lab => pattern(parseInt(lab.labNumber)));
            // Test if any of these tabs work by trying to access the first one
            try {
              const testRows = await getSheetData(subject, labTabs[0], bypassCache);
              if (testRows.length > 0) break; // Found working pattern
            } catch (e: any) {
              continue; // Try next pattern
            }
          }
          
          if (labTabs.length === 0) {
            // Ultimate fallback: Lab1, Lab2, Lab3, Lab4, Lab5
            labTabs = ['Lab1', 'Lab2', 'Lab3', 'Lab4', 'Lab5'];
          }
        } else {
          // Default fallback tabs - prefer Lab1 format based on user feedback
          labTabs = ['Lab1', 'Lab2', 'Lab3', 'Lab4', 'Lab5'];
        }
      }
      
      if (labTabs.length === 0) {
        // console.warn(`[getAllScores] No lab tabs configured for ${subject}`);
        return [];
      }
      
      // Get student roster from first available lab tab
      let baseStudents: any[] = [];
      let firstTabFound = false;
      
      for (const tabName of labTabs) {
        try {
          const rosterRows = await getSheetData(subject, tabName, bypassCache);
          if (rosterRows.length > 0) {
            baseStudents = mapRowsToStudents(rosterRows, subject, config);
            firstTabFound = true;
            break;
          }
        } catch (e: any) {
        //   console.warn(`[getAllScores] Cannot access ${tabName} for ${subject}:`, e.message);
          continue;
        }
      }
      
      if (!firstTabFound) {
        // console.warn(`[getAllScores] No accessible lab tabs found for ${subject}`);
        return [];
      }
      
      // Create student map with ID, name, surname from first tab
      let allStudentsMap: Record<string, any> = {};
      baseStudents.forEach(student => {
        if (student.username) {
          allStudentsMap[student.username] = {
            username: student.username,
            // Extract name and surname if available
            name: student.name || '',
            surname: student.surname || '',
            LA: student.LA || '',
            Section: student.Section || '',
            total: '0'
          };
        }
      });
      
      // Fetch scores from each lab tab (skip errors)
      const labDataResults = await Promise.all(labTabs.map(async (tabName, index) => {
          try {
              const rows = await getSheetData(subject, tabName, bypassCache);
              if (rows.length === 0) return [];
              // Extract lab number from tab name for criteria column naming
              const labNum = index + 1; // Or extract from tabName if it contains the number
              const labNumMatch = tabName.match(/\d+/);
              const actualLabNum = labNumMatch ? labNumMatch[0] : String(labNum);
              return mapRowsToStudents(rows, subject, { ...config, currentLabNumber: actualLabNum });
          } catch(e: any) {
            //   console.warn(`[getAllScores] Failed to fetch ${tabName}: ${e.message}`);
              return [];
          }
      }));

      // Merge scores from all lab tabs while preserving student info
      labDataResults.flat().forEach(student => {
          if (!student.username || !allStudentsMap[student.username]) return;
          
          // Merge lab scores and criteria scores but keep original student info
          Object.keys(student).forEach(key => {
            // Include multi-question format (l1-q1, l2-q1, etc.)
            if (key.startsWith('l') && key.includes('-q')) {
              allStudentsMap[student.username][key] = student[key];
            }
            // Include criteria columns (Ethics, Code Understanding, Reflection)
            else if (key === 'Ethics' || key === 'Code Understanding' || key === 'Reflection') {
              allStudentsMap[student.username][key] = student[key];
            }
            // Include Lab-specific criteria columns (Lab 1 Ethics, Lab 2 Code Understanding, etc.)
            else if (key.match(/^Lab \d+ (Ethics|Code Understanding|Reflection)$/)) {
              allStudentsMap[student.username][key] = student[key];
            }
            // Include Lab scores (Lab 1, Lab 2, etc.)
            else if (key.startsWith('Lab ')) {
              allStudentsMap[student.username][key] = student[key];
            }
          });
          // Update total if provided
          if (student.total && student.total !== '0') {
            allStudentsMap[student.username].total = student.total;
          }
      });
      
      const result = Object.values(allStudentsMap);
    //   console.log(`[getAllScores] Tab per lab strategy for ${subject}: found ${result.length} students from ${labTabs.length} tabs`);
    //   if (result.length > 0) {
        // console.log(`[getAllScores] Sample student keys for ${subject}:`, Object.keys(result[0]));
    //   }
      return result;
  }

  // Strategy: Tab per Section
  const isMultiSection = (config?.dataSourceType === 'tab_per_section') || 
                         (subject === 'ITCS123' || subject === 'ITCS223' || subject === 'ITDS283');
                         
  if (isMultiSection) {
      let tabs: string[] = [];
      
      // Use configured tabs if available
      if (config?.sheetTabs) {
          tabs = config.sheetTabs.split(',').map((t: string) => t.trim());
      } else {
          // Fallback legacy defaults
          if (subject === 'ITCS123') tabs = ['Sec1', 'Sec2', 'Sec3'];
          else if (subject === 'ITCS223') tabs = ['Section 1', 'Section 2', 'Section 3'];
          else if (subject === 'ITDS283') tabs = ['Section 1', 'Section 2'];
          else tabs = ['Sec1', 'Sec2']; // Generic default
      }

      // console.log(`[getAllScores] Fetching multi-section: ${tabs.join(', ')}`);
      
      const promises = tabs.map(tab => getSheetData(subject, tab, bypassCache).catch(e => {
        //   console.warn(`[getAllScores] Failed to fetch ${tab}: ${e.message}`);
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
  const rows = await getSheetData(subject, undefined, bypassCache);
  let students = mapRowsToStudents(rows, subject, config);
  
  // Special handling for ITCS113: fetch name/surname from separate sheet
  if (subject === 'ITCS113') {
    try {
      const nameSheetId = '1Sa8K_SPKuhqDHFuwlIrH_8lSdA3aMPqzuKsadwEkCXc';
      const sheets = await getSheetsClient();
      
      // First get sheet info to see the sheet names
      const spreadsheetInfo = await sheets.spreadsheets.get({
        spreadsheetId: nameSheetId,
      });
      
      const firstSheetName = spreadsheetInfo.data.sheets?.[0]?.properties?.title || 'Sheet1';
      
      const nameResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: nameSheetId,
        range: `${firstSheetName}!A1:C1000`,
      });
      
      const nameRows = nameResponse.data.values || [];
      if (nameRows.length > 0) {
        // Create a map of ID -> {name, surname}
        const nameMap: { [key: string]: { name: string, surname: string } } = {};
        
        // Skip header row (index 0)
        for (let i = 1; i < nameRows.length; i++) {
          const row = nameRows[i];
          const id = row[0]?.toString().trim(); // ID column
          const name = row[1]?.toString().trim(); // Name column  
          const surname = row[2]?.toString().trim(); // Surname column
          
          if (id && name && surname) {
            nameMap[id] = { name, surname };
          }
        }
        
        // Merge name data into students
        students = students.map(student => {
          const nameData = nameMap[student.username];
          if (nameData) {
            return {
              ...student,
              name: nameData.name,
              surname: nameData.surname
            };
          }
          return student;
        });
      }
    } catch (error) {
      // Failed to fetch name data
    }
  }
  
  return students;
}

export async function getStudentAllScores(username: string, sheetName: string = 'Sheet1', bypassCache: boolean = false) {
    const scores = await getAllScores(sheetName, bypassCache);
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
  isCsv: boolean = false,
  inClass?: boolean // For ITCS251/255 in-class tracking
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
      // Use configurable tab pattern or fallback to default
      const labInt = parseInt(labNumber.replace(/[^\d]/g, ''));
      
      if (config?.tabPattern) {
          // Replace {labId} with actual lab number
          const tabName = config.tabPattern.replace('{labId}', labInt.toString());
          targetTabs = [tabName];
      } else if (!isNaN(labInt)) {
          // Default fallback patterns to try in order
          const patterns = [
              `Lab${labInt}`,      // Lab1, Lab2, Lab3 (ITCS258 style)
              `Lab ${labInt}`,     // Lab 1, Lab 2, Lab 3  
              `lab${labInt}`,      // lab1, lab2, lab3
              `lab ${labInt}`,     // lab 1, lab 2, lab 3
          ];
          targetTabs = patterns;
      }
  }
  // Strategy: Tab Per Section (Multi-Sheet)
  else if (config?.dataSourceType === 'tab_per_section' || 
           ['ITCS123', 'ITCS223', 'ITDS283'].includes(sheetName)) {
      
      if (config?.sheetTabs) {
          targetTabs = config.sheetTabs.split(',').map((t: string) => t.trim());
      } else {
          // Fallback
          if (sheetName === 'ITCS123') targetTabs = ['Sec1', 'Sec2', 'Sec3'];
          else if (sheetName === 'ITCS223') targetTabs = ['Section 1', 'Section 2', 'Section 3'];
          else if (sheetName === 'ITDS283') targetTabs = ['Section 1', 'Section 2'];
          else targetTabs = ['Sec1', 'Sec2'];
      }
  } else if (sheetName === 'ITCS113') {
      targetTabs = ['lab'];
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
               await updateSpecificTab(sheetName, tab, username, actualLabNumber, score, feedback, isCsv, config, inClass);
               foundAndUpdate = true;
               break; 
           }
       } else {
           // Single target (Standard or Specific Lab Tab) - Allow creation or update
           await updateSpecificTab(sheetName, tab, username, actualLabNumber, score, feedback, isCsv, config, inClass);
           foundAndUpdate = true;
       }
  }
  
  if (!foundAndUpdate && targetTabs.length > 1) {
      // Default to first tab if not found?
      // console.log(`[updateStudentLabScore] User not found in any section tab. Defaulting to ${targetTabs[0]}`);
      await updateSpecificTab(sheetName, targetTabs[0], username, actualLabNumber, score, feedback, isCsv, config, inClass);
  }
}

// Helper to update XLSX file directly (Download -> Modify -> Upload)
async function updateXlsxData(spreadsheetId: string, tabName: string, updates: { col: number, row: number, value: any }[]) {
    // console.log(`[updateXlsxData] Attempting XLSX update for file: ${spreadsheetId}, Tab: ${tabName}, Updates: ${updates.length}`);
    try {
        const drive = await getDriveClient();
        
        // First, check file permissions and metadata
        try {
            const fileMetadata = await drive.files.get({
                fileId: spreadsheetId,
                fields: 'name,mimeType,capabilities,permissions'
            });
            // console.log(`[updateXlsxData] File metadata:`, {
            //     name: fileMetadata.data.name,
            //     mimeType: fileMetadata.data.mimeType,
            //     canEdit: fileMetadata.data.capabilities?.canEdit,
            // });
        } catch (metaError: any) {
            // console.error(`[updateXlsxData] Failed to get file metadata:`, metaError.message);
        }
        
        // 1. Download File
        // console.log(`[updateXlsxData] Downloading file: ${spreadsheetId}`);
        const res = await drive.files.get({
            fileId: spreadsheetId,
            alt: 'media',
        }, { responseType: 'arraybuffer' });

        // console.log(`[updateXlsxData] Download successful, size: ${(res.data as ArrayBuffer).byteLength} bytes`);
        
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
        // console.error(`[updateXlsxData] Failed to update XLSX file: ${spreadsheetId}`);
        // console.error(`[updateXlsxData] Error:`, e.message);
        // console.error(`[updateXlsxData] Status:`, e.code || 'unknown');
        
        if (e.code === 403) {
            // console.error(`[updateXlsxData] Permission denied! The service account needs write access to this file.`);
            // console.error(`[updateXlsxData] File ID: ${spreadsheetId}`);
            // console.error(`[updateXlsxData] Service account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
            // console.error(`[updateXlsxData] Solution: Share the Google Sheet with the service account email and grant 'Editor' permissions.`);
        }
        
        throw e;
    }
}

// Student lookup cache to avoid re-scanning rows for each update
const studentRowCache = new Map<string, { spreadsheetId: string, rowIndex: number, timestamp: number }>();
const STUDENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Internal helper for actual update logic
async function updateSpecificTab(subject: string, tabName: string, username: string, labNumber: string, score: number, feedback?: string, isCsv: boolean = false, config?: any, inClass?: boolean) {
  const sheets = await getSheetsClient();
  const spreadsheetId = await getSubjectSheetId(subject);
  
  // Use cached sheet data to avoid repeated API calls
  const rows = await getSheetData(subject, tabName, false); // Use cache
  
  // Header Config - For ITCS251/255, both header and data start at row 5
  const headerRow = (subject === 'ITCS251' || subject === 'ITCS255') ? 5 : (config?.headerRow || 1);
  const startRow = (subject === 'ITCS251' || subject === 'ITCS255') ? 5 : 1;
  const headerIdx = headerRow - startRow; // Relative index in 'rows' array

  let headers = (rows.length > headerIdx && rows[headerIdx]) ? rows[headerIdx] : [];
  
  // Ensure headers is always an array
  if (!Array.isArray(headers)) {
    headers = [];
  }
  
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
  

  
  // 1. Exact Match
  let labIndex = headers.findIndex((h: string) => h === labNumber);
  
  if (labIndex === -1) {
      labIndex = headers.findIndex((h: string) => h.toLowerCase() === labNumber.toLowerCase());
  }
  
  // 2. Subject-specific pattern matching
  if (labIndex === -1) {
      if (subject === 'ITCS251' || subject === 'ITCS255') {
          // For Python and SQL courses, look for "W {labNumber}" pattern
          const labInt = parseInt(labNumber.toString().replace(/[^\d]/g, '')).toString();
          const wPattern = `W ${labInt}`;
          labIndex = headers.findIndex((h: string) => String(h).trim() === wPattern);
      }
  }
  
  // 3. Regex Match (Enhanced)
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
          const labRegex = new RegExp(`^(Lab|Ch|L|W|Week)\\s*(${labInt}|${labNumPad})\\b`, 'i');
          labIndex = headers.findIndex((h: string) => labRegex.test(h));
      }
  }
  
  // Feedback Column
  // Usually adjacent or named specifically
  let feedbackIndex = headers.findIndex((h: string) => h === `${labNumber} Feedback` || h === `Lab ${labInt} Feedback`);
  
  // Subject-specific feedback patterns
  if (feedbackIndex === -1 && (subject === 'ITCS251' || subject === 'ITCS255')) {
      feedbackIndex = headers.findIndex((h: string) => h === `W ${labInt} Feedback`);
  }
  
  const pendingUpdates : any[] = [];
  const xlsxUpdates : { col: number, row: number, value: any }[] = [];

  // Add Header if missing
  if (labIndex === -1) {
      labIndex = headers.length; 
      let headerValue = labNumber;
      
      // Format header for specific subjects
      if (subject === 'ITDS283') {
          const labInt = parseInt(labNumber.toString().replace(/[^\d]/g, '')).toString();
          const labNumPadded = labInt.padStart(2, '0');
          headerValue = `Lab${labNumPadded}`;
      } else if (subject === 'ITCS251' || subject === 'ITCS255') {
          // For Python and SQL courses, use "W {labNumber}" format
          const labInt = parseInt(labNumber.toString().replace(/[^\d]/g, '')).toString();
          headerValue = `W ${labInt}`;
      }
      
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
  let idIndex = ['ITCS123','ITCS223','ITCS251','ITCS255','ITDS283','ITCS113','ITCS258'].includes(subject) ? 1 : 0;
  
  // Check for criteria-based format (Ethics, Code Understanding, Reflection columns)
  const isCriteriaBasedFormat = headers.some((h: string) => 
    String(h).toLowerCase().includes('ethics') || 
    String(h).toLowerCase().includes('code understanding') || 
    String(h).toLowerCase().includes('reflection')
  );
  if (isCriteriaBasedFormat) {
    idIndex = 1; // ID is in column B for criteria format
  }
  
  if (subject === 'ITDS283') {
       const found = headers.findIndex((h: string) => String(h).toLowerCase().trim() === 'id');
       if (found !== -1) idIndex = found;
  }

  // Optimized student row finding with cache
  const cacheKey = `${spreadsheetId}_${tabName}_${username}`;
  const cached = studentRowCache.get(cacheKey);
  let rowIndex = -1;
  
  if (cached && cached.spreadsheetId === spreadsheetId && (Date.now() - cached.timestamp < STUDENT_CACHE_TTL)) {
    // Use cached row index, but verify it's still valid
    if (cached.rowIndex < rows.length) {
      const val = rows[cached.rowIndex][idIndex];
      if (String(val).trim() === String(username).trim()) {
        rowIndex = cached.rowIndex;
      }
    }
  }
  
  // Fall back to search if cache miss or invalid
  if (rowIndex === -1) {
    rowIndex = rows.findIndex((row, idx) => {
        if (idx < headerIdx) return false; // Skip pre-header
        const val = row[idIndex];
        const isMatch = String(val).trim() === String(username).trim();
        return isMatch;
    });
    
    // Cache the found row index
    if (rowIndex !== -1) {
      studentRowCache.set(cacheKey, { 
        spreadsheetId, 
        rowIndex, 
        timestamp: Date.now() 
      });
    }
  }
  

  
  if (rowIndex === -1) {
    rowIndex = rows.length;
    let newRow = new Array(Math.max(idIndex + 1, headers.length)).fill("");
    newRow[idIndex] = username;
    
    // The `rows` array returned by `getSheetData` is already adjusted for `startRow`.
    // The relative index of the new row is `rows.length`.
    // The actual sheet row number is `rows.length` + `startRow`.
    const actualSheetRow = rows.length + startRow;
    
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
  const actualSheetRow = rowIndex + startRow;

  const scoreRange = `${tabName}!${getColumnLetter(labIndex + 1)}${actualSheetRow}`;

  
  pendingUpdates.push({
      range: scoreRange,
      values: [[score]]
  });
  xlsxUpdates.push({ col: labIndex + 1, row: actualSheetRow, value: score });
  
  // Special handling for ITCS251 and ITCS255: Update In-Class column adjacent to W column
  // Skip if initiated via CSV upload
  if ((subject === 'ITCS251' || subject === 'ITCS255') && !isCsv && inClass !== undefined) {
    // Check if the column immediately after the lab column is "In-Class"
    const nextColumnIndex = labIndex + 1;
    if (nextColumnIndex < headers.length) {
      const nextColumnHeader = headers[nextColumnIndex];
      // Check if next column is an In-Class checkbox
      if (nextColumnHeader && String(nextColumnHeader).toLowerCase().trim() === 'in-class') {
        // Update the In-Class column adjacent to this specific W column
        pendingUpdates.push({
          range: `${tabName}!${getColumnLetter(nextColumnIndex + 1)}${actualSheetRow}`,
          values: [[inClass]]
        });
        xlsxUpdates.push({ col: nextColumnIndex + 1, row: actualSheetRow, value: inClass });
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
          const result = await sheets.spreadsheets.values.batchUpdate({
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
           return await updateXlsxData(spreadsheetId, tabName, xlsxUpdates);
       }
       throw err; 
  }
}

export async function batchUpdateScores(updates: {username: string, labNumber: string, score: number, feedback?: string, sheetName?: string, subject?: string}[]) {
    for (const update of updates) {
        // console.log(`[batchUpdateScores] Updating ${update.username} for ${update.labNumber} in ${update.sheetName || update.subject || 'Default(Sheet1)'}`);
        await updateStudentLabScore(update.username, update.labNumber, update.score, update.feedback, update.sheetName || update.subject);
    }
}

export async function batchUpdateCriteriaScores(updates: {username: string, labNumber: string, score: number, criteriaType: string, subject: string}[]) {
    // Group updates by student and lab to update all criteria at once
    const groupedUpdates = new Map<string, {username: string, labNumber: string, subject: string, criteria: {[key: string]: number}}>();
    
    for (const update of updates) {
        const key = `${update.username}-${update.labNumber}-${update.subject}`;
        if (!groupedUpdates.has(key)) {
            groupedUpdates.set(key, {
                username: update.username,
                labNumber: update.labNumber,
                subject: update.subject,
                criteria: {}
            });
        }
        groupedUpdates.get(key)!.criteria[update.criteriaType] = update.score;
    }
    
    // Update each group
    for (const group of groupedUpdates.values()) {
        await updateCriteriaInTabWithPattern(group.subject, group.labNumber, group.username, group.criteria);
    }
}

// Enhanced helper function to update criteria with configurable tab patterns
async function updateCriteriaInTabWithPattern(subject: string, labNumber: string, username: string, criteria: {[key: string]: number}) {
    const config = await getSubjectConfig(subject);
    const labInt = parseInt(labNumber.replace(/[^\d]/g, ''));
    
    // Determine possible tab names based on configuration
    let possibleTabNames: string[] = [];
    
    if (config?.tabPattern) {
        // Use configured pattern
        possibleTabNames = [config.tabPattern.replace('{labId}', labInt.toString())];
    } else if (!isNaN(labInt)) {
        // Try multiple common patterns in order
        possibleTabNames = [
            `Lab${labInt}`,      // Lab1, Lab2, Lab3 (ITCS258 style) 
            `Lab ${labInt}`,     // Lab 1, Lab 2, Lab 3
            `lab${labInt}`,      // lab1, lab2, lab3
            `lab ${labInt}`,     // lab 1, lab 2, lab 3
        ];
    } else {
        // Use labNumber as-is if it's not a number
        possibleTabNames = [labNumber];
    }
    
    // Try each possible tab name until one works
    for (const tabName of possibleTabNames) {
        try {
            const result = await updateCriteriaInTab(subject, tabName, username, criteria);
            if (result) {
                // console.log(`[updateCriteriaInTabWithPattern] Successfully updated ${subject}-${tabName}`);
                return true;
            }
        } catch (e: any) {
            // console.warn(`[updateCriteriaInTabWithPattern] Failed to update ${subject}-${tabName}: ${e.message}`);
            continue;
        }
    }
    
    // console.error(`[updateCriteriaInTabWithPattern] Failed to find working tab for ${subject}-${labNumber}`);
    return false;
}

// Helper function to update specific criteria columns in a tab
async function updateCriteriaInTab(subject: string, tabName: string, username: string, criteria: {[key: string]: number}) {
    // console.log(`[updateCriteriaInTab] Starting update for ${username} in ${subject}-${tabName}:`, criteria);
    const sheets = await getSheetsClient();
    const spreadsheetId = await getSubjectSheetId(subject);
    
    const rows = await getSheetData(subject, tabName);
    // console.log(`[updateCriteriaInTab] Got ${rows.length} rows from ${tabName}`);
    
    const headerRow = 1;
    const startRow = 1;
    const headerIdx = headerRow - startRow;
    
    let headers = rows.length > headerIdx ? rows[headerIdx] : [];
    // console.log(`[updateCriteriaInTab] Headers:`, headers);
    
    // Find ID column (should be column B = index 1 for criteria format)
    let idIndex = 1;
    
    // Find row for the user
    let rowIndex = rows.findIndex((row, idx) => {
        if (idx < headerIdx) return false;
        const val = row[idIndex];
        const isMatch = String(val).trim() === String(username).trim();
        if (isMatch) {
            // console.log(`[updateCriteriaInTab] Found user at row ${idx}, ID: "${val}"`);
        }
        return isMatch;
    });
    
    if (rowIndex === -1) {
        // console.error(`[updateCriteriaInTab] User ${username} not found in ${subject}-${tabName}`);
        // console.log(`[updateCriteriaInTab] Available IDs:`, rows.slice(1).map(row => row[idIndex]).filter(id => id));
        return;
    }
    
    const actualSheetRow = rowIndex + startRow;
    // console.log(`[updateCriteriaInTab] User found at row ${actualSheetRow}`);
    
    const pendingUpdates: any[] = [];
    const xlsxUpdates: { col: number, row: number, value: any }[] = [];
    
    // Find column indices for each criteria
    const criteriaColumns = {
        'Ethics': headers.findIndex(h => String(h).toLowerCase().includes('ethics')),
        'Code Understanding': headers.findIndex(h => String(h).toLowerCase().includes('code understanding')),
        'Reflection': headers.findIndex(h => String(h).toLowerCase().includes('reflection'))
    };
    
    // console.log(`[updateCriteriaInTab] Criteria columns:`, criteriaColumns);
    
    // Update each criteria score
    for (const [criteriaName, score] of Object.entries(criteria)) {
        const columnIndex = criteriaColumns[criteriaName as keyof typeof criteriaColumns];
        if (columnIndex !== -1) {
            const range = `${tabName}!${getColumnLetter(columnIndex + 1)}${actualSheetRow}`;
            // console.log(`[updateCriteriaInTab] Updating ${criteriaName}: ${range} = ${score}`);
            pendingUpdates.push({
                range: range,
                values: [[score]]
            });
            xlsxUpdates.push({ col: columnIndex + 1, row: actualSheetRow, value: score });
        } else {
            // console.error(`[updateCriteriaInTab] Column for ${criteriaName} not found!`);
        }
    }
    
    // console.log(`[updateCriteriaInTab] Total updates: ${pendingUpdates.length}`);
    
    // Apply updates
    try {
        if (pendingUpdates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: spreadsheetId,
                requestBody: {
                    valueInputOption: 'RAW',
                    data: pendingUpdates,
                },
            });
            // console.log(`[updateCriteriaInTab] Google Sheets API update successful`);
        }
        return true;
    } catch (e: any) {
        // console.error(`[updateCriteriaInTab] Google Sheets API failed, trying XLSX update:`, e.message);
        if (xlsxUpdates.length > 0) {
            return await updateXlsxData(spreadsheetId, tabName, xlsxUpdates);
        }
        return false;
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
