import { google } from 'googleapis';
import { getCanonicalSubjectCode, normalizeSubjectCode } from '@/lib/subjectConfig';

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
            if (
              key.includes(`_${subject}_`) ||
              key.includes(`_${subject}`) ||
              key === `prefixes_${subject}`
            ) {
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

// Helper to find target subject resolving case, canonical codes, and aliases
function findTargetSubject(subjects: any[], subjectInput: string) {
    if (!subjectInput || !subjects || subjects.length === 0) return null;
    const upperInput = normalizeSubjectCode(subjectInput) || subjectInput.toUpperCase().trim();
    const canonical = getCanonicalSubjectCode(upperInput) || upperInput;
    const canonicalUpper = normalizeSubjectCode(canonical) || canonical;

    // 1. Direct code match (case-insensitive)
    let found = subjects.find(s => {
        const sCode = normalizeSubjectCode(s.code);
        return sCode === upperInput || sCode === canonicalUpper;
    });
    if (found) return found;

    // 2. Alias match
    found = subjects.find(s => {
        const aliases = (s.aliases || []).map((a: string) => normalizeSubjectCode(a));
        return aliases.includes(upperInput) || aliases.includes(canonicalUpper);
    });
    return found || null;
}

// Helper to get Google Sheets ID from database
async function getSubjectSheetId(subject: string): Promise<string> {
    let subjects = await getCachedSubjects(); 
    
    let target = findTargetSubject(subjects, subject);
    
    if (target && target.googleSheetId) {
        return target.googleSheetId;
    }

    if (target && !target.googleSheetId) {
        // Clear cache and try one more time
        clearSubjectsCache();
        subjects = await getCachedSubjects();
        target = findTargetSubject(subjects, subject);
        
        if (target && target.googleSheetId) {
            return target.googleSheetId;
        }
    } else {
        // Clear cache and try one more time
        clearSubjectsCache();
        subjects = await getCachedSubjects();
        target = findTargetSubject(subjects, subject);
        
        if (target && target.googleSheetId) {
            return target.googleSheetId;
        }
    }

    // Final detailed error
    throw new Error(
        `Google Sheets ID not configured for subject: ${subject}. ` +
        `Please configure it in the Admin UI at /admin/subjects`
    );
}


import * as XLSX from 'xlsx';

// Connection pool for API clients to reduce initialization overhead
let cachedAuthClient: any = null;
let cachedSheetsClient: any = null;
let cachedDriveClient: any = null;
let clientCacheTime = 0;
const CLIENT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getAuthClient() {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google Sheets credential environment variables');
  }
  
  // Reuse cached client if still valid
  if (cachedAuthClient && Date.now() - clientCacheTime < CLIENT_CACHE_TTL) {
    return cachedAuthClient;
  }
  
  cachedAuthClient = new google.auth.GoogleAuth({
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
  clientCacheTime = Date.now();
  return cachedAuthClient;
}

async function getSheetsClient() {
  // Reuse cached client if still valid
  if (cachedSheetsClient && Date.now() - clientCacheTime < CLIENT_CACHE_TTL) {
    return cachedSheetsClient;
  }
  
  const auth = await getAuthClient();
  cachedSheetsClient = google.sheets({ version: 'v4', auth });
  return cachedSheetsClient;
}

async function getDriveClient() {
    // Reuse cached client if still valid
    if (cachedDriveClient && Date.now() - clientCacheTime < CLIENT_CACHE_TTL) {
      return cachedDriveClient;
    }
    
    const auth = await getAuthClient();
    cachedDriveClient = google.drive({ version: 'v3', auth });
    return cachedDriveClient;
}

// Simple in-memory cache for Google Sheets data with LRU eviction
interface CacheEntry {
    data: any[][] | string[];
    timestamp: number;
}
interface CacheWithLRU {
    cache: Map<string, CacheEntry>;
    accessOrder: string[];
    maxSize: number;
    set(key: string, value: CacheEntry): void;
    get(key: string): CacheEntry | undefined;
    has(key: string): boolean;
    delete(key: string): void;
    clear(): void;
    keys(): IterableIterator<string>;
}

const createLRUCache = (maxSize: number): CacheWithLRU => ({
    cache: new Map(),
    accessOrder: [],
    maxSize,
    set(key, value) {
        if (this.cache.has(key)) {
            this.accessOrder = this.accessOrder.filter(k => k !== key);
        } else if (this.cache.size >= this.maxSize) {
            const oldest = this.accessOrder.shift();
            if (oldest) this.cache.delete(oldest);
        }
        this.cache.set(key, value);
        this.accessOrder.push(key);
    },
    get(key) {
        if (!this.cache.has(key)) return undefined;
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        this.accessOrder.push(key);
        return this.cache.get(key);
    },
    has(key) {
        return this.cache.has(key);
    },
    delete(key) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
    },
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    },
    keys() {
        return this.cache.keys();
    }
});

const sheetsCache = createLRUCache(100); // Max 100 cached sheets
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache (reduced for freshness)
const PREFIX_CACHE_TTL = 30 * 60 * 1000; // Student ID prefixes change rarely

const GOOGLE_SHEETS_MIME = 'application/vnd.google-apps.spreadsheet';
const XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

const mimeTypeCache = new Map<string, { mime: string; timestamp: number }>();
const MIME_CACHE_TTL = 10 * 60 * 1000;

/** Only true for uploaded .xlsx files — not generic Sheets API 400 errors (e.g. bad tab name). */
function isUnsupportedSpreadsheetDocumentError(err: any): boolean {
  const message = String(err?.message || err?.response?.data?.error?.message || '');
  return message.includes('not supported for this document');
}

async function getSpreadsheetMimeType(spreadsheetId: string): Promise<string | null> {
  const cached = mimeTypeCache.get(spreadsheetId);
  if (cached && Date.now() - cached.timestamp < MIME_CACHE_TTL) {
    return cached.mime;
  }
  try {
    const drive = await getDriveClient();
    const res = await drive.files.get({ fileId: spreadsheetId, fields: 'mimeType' });
    const mime = res.data.mimeType || '';
    mimeTypeCache.set(spreadsheetId, { mime, timestamp: Date.now() });
    return mime;
  } catch {
    return null;
  }
}

async function listGoogleSheetTabNames(spreadsheetId: string): Promise<string[]> {
  const sheets = await getSheetsClient();
  const info = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });
  return (info.data.sheets || [])
    .map((s: { properties?: { title?: string | null } }) => s.properties?.title || '')
    .filter((title: string) => title.length > 0);
}

async function resolveGoogleSheetTabName(
  spreadsheetId: string,
  preferredTab: string,
  fallbacks: string[] = []
): Promise<string> {
  const tabs = await listGoogleSheetTabNames(spreadsheetId);
  if (tabs.includes(preferredTab)) return preferredTab;
  for (const fallback of fallbacks) {
    if (fallback && tabs.includes(fallback)) return fallback;
  }
  throw new Error(
    `Sheet tab "${preferredTab}" not found. Available tabs: ${tabs.join(', ')}`
  );
}

/** Resolve tab for native Google Sheets; skip for uploaded .xlsx files. */
async function resolveTabNameForSpreadsheet(
  spreadsheetId: string,
  preferredTab: string,
  fallbacks: string[] = []
): Promise<string> {
  const mime = await getSpreadsheetMimeType(spreadsheetId);
  if (mime && XLSX_MIME_TYPES.has(mime)) {
    return preferredTab;
  }
  if (mime && mime !== GOOGLE_SHEETS_MIME) {
    return preferredTab;
  }
  return resolveGoogleSheetTabName(spreadsheetId, preferredTab, fallbacks);
}

function formatSheetUpdateError(tabName: string, err: any, availableTabs?: string[]): Error {
  const base = String(err?.message || err?.response?.data?.error?.message || 'Unknown error');
  if (availableTabs?.length) {
    return new Error(
      `Failed to update sheet tab "${tabName}". Available tabs: ${availableTabs.join(', ')}. (${base})`
    );
  }
  return new Error(`Failed to update sheet tab "${tabName}": ${base}`);
}

function studentIdsMatch(sheetId: string | undefined, inputId: string): boolean {
  const a = String(sheetId ?? '').trim();
  const b = String(inputId ?? '').trim();
  if (!a || !b) return false;
  if (a === b) return true;
  return a.replace(/^[uU]/, '') === b.replace(/^[uU]/, '');
}

const MULTI_SECTION_SUBJECTS = new Set([
  'ITCS123', 'ITCS223', 'ITCS251', 'ITCS255', 'ITDS283', 'ITCS113', 'ITCS258',
]);

/** Parse admin-configured student ID column (letter, 1-based number, or header name). */
function parseStudentIdColumnConfig(configured: string, headers: any[]): number {
  let value = configured.trim();
  if (!value) return -1;

  // 1. First try matching exact header name (e.g. "ID", "Student ID", "Email")
  const lower = value.toLowerCase();
  const headerIndex = headers.findIndex(
    (h) => String(h ?? '').toLowerCase().trim() === lower
  );
  if (headerIndex !== -1) return headerIndex;

  // 2. Extract column letter from cell notation like "A2", "A1", "Col A", "Column A"
  const cellMatch = value.match(/^(?:col(?:umn)?\s*)?([A-Za-z]+)\d*$/i);
  if (cellMatch?.[1]) {
    let colIndex = 0;
    const upper = cellMatch[1].toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      colIndex = colIndex * 26 + (upper.charCodeAt(i) - 64);
    }
    return colIndex - 1;
  }

  // 3. 1-based column number (e.g. "1" for Col A)
  const asNumber = parseInt(value, 10);
  if (!Number.isNaN(asNumber) && asNumber >= 1) {
    return asNumber - 1;
  }

  return -1;
}

/** Resolve which column holds student IDs — must match mapRowsToStudents logic. */
function resolveIdColumnIndex(
  headers: any[],
  subject: string,
  config?: { studentIdColumn?: string }
): number {
  const configured = config?.studentIdColumn?.trim();
  if (configured) {
    const fromConfig = parseStudentIdColumnConfig(configured, headers);
    if (fromConfig !== -1) return fromConfig;
  }

  const headerIndices = new Map<string, number>();
  headers.forEach((h: string, idx: number) => {
    const lowerH = String(h ?? '').toLowerCase().trim();
    if (lowerH) headerIndices.set(lowerH, idx);
  });

  const isCriteriaBasedFormat = headers.some((h: string) => {
    const hStr = String(h ?? '');
    return (
      REGEX_PATTERNS.ethicsColumn.test(hStr) ||
      REGEX_PATTERNS.codeUnderstandingColumn.test(hStr) ||
      REGEX_PATTERNS.reflectionColumn.test(hStr)
    );
  });

  for (const name of ['id', 'student id', 'studentid', 'no', 'number', 'student no']) {
    if (headerIndices.has(name)) {
      return headerIndices.get(name)!;
    }
  }

  if (isCriteriaBasedFormat) {
    return 1;
  }

  if (subject === 'ITDS283') {
    const found = headers.findIndex((h: string) => String(h).toLowerCase().trim() === 'id');
    if (found !== -1) return found;
  }

  if (MULTI_SECTION_SUBJECTS.has(subject)) {
    if (headerIndices.has('name') || headerIndices.has('firstname')) {
      return 0;
    }
    return 1;
  }

  return 0;
}

/** Find a student row; scans columns A–C if the configured ID column does not match. */
function findStudentInRows(
  rows: any[][],
  username: string,
  headerIdx: number,
  headers: any[],
  subject: string,
  config?: { studentIdColumn?: string }
): { rowIndex: number; idIndex: number } {
  const preferredIdIndex = resolveIdColumnIndex(headers, subject, config);
  const columnsToTry = [preferredIdIndex, 0, 1, 2].filter(
    (col, i, arr) => col >= 0 && arr.indexOf(col) === i
  );

  for (let idx = 0; idx < rows.length; idx++) {
    if (idx <= headerIdx) continue;
    const row = rows[idx];
    for (const col of columnsToTry) {
      if (col < row.length && studentIdsMatch(row[col], username)) {
        return { rowIndex: idx, idIndex: col };
      }
    }
  }

  return { rowIndex: -1, idIndex: preferredIdIndex };
}

function isGridLimitsError(err: any): boolean {
  const message = String(err?.message || err?.response?.data?.error?.message || '');
  return message.includes('exceeds grid limits');
}

async function getXlsxData(spreadsheetId: string, tabName: string, timeout: number = 30000) {
    const cacheKey = `xlsx_${spreadsheetId}_${tabName}`;
    const cached = sheetsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    try {
        const drive = await getDriveClient();
        
        // Add timeout to API call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const res = await drive.files.get({
            fileId: spreadsheetId,
            alt: 'media',
        }, { responseType: 'arraybuffer' });
        
        clearTimeout(timeoutId);

        const buffer = Buffer.from(res.data as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        let targetSheet = tabName;
        if (!workbook.Sheets[targetSheet]) {
            if (workbook.Sheets['Sheet1']) {
                 targetSheet = 'Sheet1';
            } else if (workbook.SheetNames.length > 0) {
                 targetSheet = workbook.SheetNames[0];
            }
        }

        const worksheet = workbook.Sheets[targetSheet];
        if (!worksheet) return [];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Cache the result
        sheetsCache.set(cacheKey, { data: jsonData, timestamp: Date.now() });
        return jsonData;

    } catch (e: any) {
        if (e.name === 'AbortError') {
            console.warn(`[getXlsxData] Request timeout for ${spreadsheetId}`);
        }
        return [];
    }
}

export async function getSheetData(subject: string = 'Sheet1', tabName?: string, bypassCache: boolean = false) {
  const spreadsheetId = await getSubjectSheetId(subject);
  const config = await getSubjectConfig(subject);

  // Removed ITCS113 special block to default to starting from 'A' and using 'Sheet1' or subject name fallback
  let firstRow = 'A';

  // Use configured tab name if specified, otherwise tabName or fallbacks (score, Score, lab, Sheet1)
  let targetTab = config?.singleSheetTabName || tabName || subject;

  targetTab = await resolveTabNameForSpreadsheet(spreadsheetId, targetTab, [
    config?.singleSheetTabName || '',
    'score',
    'Score',
    'lab',
    subject,
    'Sheet1'
  ].filter(Boolean));
  
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
      if (isUnsupportedSpreadsheetDocumentError(err)) {
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

// Pre-compiled regex patterns for better performance
const REGEX_PATTERNS = {
    camelCase: /[a-z][A-Z]/,
    labNumber: /^(?:Lab\s*|L)(\d+)(?:\s*\(.*\))?$/i,
    weekNumber: /^(?:W|Week)\s*(\d+)/i,
    challengeNumber: /^(?:Ch\s*|Challenge\s*)(\d+)(?:\s*\(.*\))?$/i,
    labQuestionFormat: /^l(\d+)-q(\d+)$/i,
    labTabPattern: /^lab\s*\d+$/i,
    feedbackColumn: /Feedback/i,
    nameColumn: /^\s*(name|firstname)\s*$/i,
    surnameColumn: /^\s*(surname|lastname)\s*$/i,
    totalColumn: /^\s*(Sum|Total)(?:\s*\((\d+)\))?\s*$/i,
    inClassColumn: /^\s*in-class\s*$/i,
    ethicsColumn: /ethics/i,
    codeUnderstandingColumn: /code understanding/i,
    reflectionColumn: /reflection/i,
};

/** Parse lab number from a column header (full-string patterns only). */
function parseLabNumberFromColumnHeader(header: string): number | null {
  const h = String(header ?? '').trim();
  if (!h) return null;

  const matchQ = h.match(/^(?:Lab\s*|L|l)(\d+)[-_]?q\d+/i);
  if (matchQ?.[1]) {
    const n = parseInt(matchQ[1], 10);
    if (!Number.isNaN(n)) return n;
  }

  const patterns = [
    REGEX_PATTERNS.labNumber,
    REGEX_PATTERNS.weekNumber,
    REGEX_PATTERNS.challengeNumber,
  ];
  for (const pattern of patterns) {
    const match = h.match(pattern);
    if (match?.[1]) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

/**
 * Parse the intended lab number from API/UI input.
 * Avoids parseInt("012") === 12 when labNumber is "Lab01 (2)" (ITCS123).
 */
function parseRequestedLabNumber(labNumber: string): number | null {
  const trimmed = String(labNumber ?? '').trim();
  if (!trimmed) return null;

  const fromHeader = parseLabNumberFromColumnHeader(trimmed);
  if (fromHeader !== null) return fromHeader;

  if (/^\d{1,2}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return Number.isNaN(n) ? null : n;
  }

  return null;
}

function buildAnchoredColumnPattern(configPattern: string, labInt: string, labNumPad: string): RegExp {
  const labIdPattern = `(?:${labNumPad}|${labInt})`;
  let pattern = configPattern
    .replace(/\{labId\}/g, labIdPattern)
    .replace(/\{questionId\}/g, '\\w+');
  if (!pattern.startsWith('^')) pattern = `^${pattern}`;
  if (!pattern.endsWith('$')) pattern = `${pattern}$`;
  return new RegExp(pattern, 'i');
}

/** Find the sheet column for a lab score — avoids matching L12 when updating lab 1. */
function findLabColumnIndex(
  headers: any[],
  labNumber: string,
  subject: string,
  config?: { columnPattern?: string }
): number {
  const labNumberStr = String(labNumber ?? '').trim();
  if (!labNumberStr) return -1;

  // 1. Try exact header match first (e.g. "Lab1-Q1", "l1-q1", "Lab 1")
  const exactIdx = headers.findIndex(
    (h) => String(h ?? '').trim().toLowerCase() === labNumberStr.toLowerCase()
  );
  if (exactIdx !== -1) return exactIdx;

  // 2. Try question-specific header matching (e.g. lab 1 question 2 -> matches "Lab1-Q2", "l1-q2", "Lab 1 Q2")
  const qMatch = labNumberStr.match(/^(?:Lab|L|l)?(\d+)[-_]?(?:Q|q)?(\d+)$/i);
  if (qMatch?.[1] && qMatch?.[2]) {
    const targetLab = parseInt(qMatch[1], 10);
    const targetQ = parseInt(qMatch[2], 10);
    
    const qIdx = headers.findIndex((h) => {
      const headerStr = String(h ?? '').trim();
      const m = headerStr.match(/^(?:Lab|L|l)?(\d+)[-_]?(?:Q|q)?(\d+)$/i);
      return m && parseInt(m[1], 10) === targetLab && parseInt(m[2], 10) === targetQ;
    });
    if (qIdx !== -1) return qIdx;
  }

  const labIntNum = parseRequestedLabNumber(labNumber);
  if (labIntNum === null) return -1;
  const labInt = labIntNum.toString();
  const labNumPad = labIntNum.toString().padStart(2, '0');

  if (config?.columnPattern?.trim()) {
    try {
      const regex = buildAnchoredColumnPattern(config.columnPattern, labInt, labNumPad);
      const idx = headers.findIndex((h) => regex.test(String(h ?? '').trim()));
      if (idx !== -1) return idx;
    } catch {
      // invalid pattern — fall through
    }
  }

  const matches: { index: number; specificity: number }[] = [];
  headers.forEach((h, index) => {
    const header = String(h ?? '').trim();
    if (parseLabNumberFromColumnHeader(header) !== labIntNum) return;

    let specificity = 10;
    if (new RegExp(`^L${labNumPad}$`, 'i').test(header)) specificity = 100;
    else if (new RegExp(`^L${labInt}$`, 'i').test(header)) specificity = 90;
    else if (new RegExp(`^Lab\\s*${labNumPad}$`, 'i').test(header)) specificity = 80;
    else if (new RegExp(`^Lab\\s*${labInt}$`, 'i').test(header)) specificity = 70;
    else if (REGEX_PATTERNS.weekNumber.test(header)) specificity = 60;

    matches.push({ index, specificity });
  });

  if (matches.length > 0) {
    matches.sort((a, b) => b.specificity - a.specificity);
    return matches[0].index;
  }

  if (subject === 'ITCS251' || subject === 'ITCS255') {
    const wPattern = `W ${labInt}`;
    const idx = headers.findIndex((h) => String(h).trim() === wPattern);
    if (idx !== -1) return idx;
  }

  return -1;
}

/** Pick header name for a new lab column based on existing sheet conventions. */
function inferLabColumnHeaderName(headers: any[], labInt: string, labNumPad: string, labNumber: string): string {
  const trimmed = headers.map((h) => String(h ?? '').trim()).filter(Boolean);
  if (trimmed.some((h) => /^L\d{2}$/i.test(h))) return `L${labNumPad}`;
  if (trimmed.some((h) => /^L\d+$/i.test(h))) return `L${labInt}`;
  if (trimmed.some((h) => /^Lab\s+\d+/i.test(h))) return `Lab ${labInt}`;
  if (/^L\d*$/i.test(labNumber.trim())) return `L${labNumPad}`;
  return labNumber;
}

// Helper to fix mashed names (e.g., "NatanonKreangarekul" -> "Natanon Kreangarekul")
function fixMashedName(name: string): string {
    if (!name || typeof name !== 'string') return '';
    // If name has no spaces and has CamelCase (lower followed by Upper), split it.
    if (!name.includes(' ') && REGEX_PATTERNS.camelCase.test(name)) {
        return name.replace(/([a-z])([A-Z])/g, '$1 $2');
    }
    return name.trim();
}

// Helper to get full subject config
async function getSubjectConfig(subjectCode: string) {
    try {
        const subjects = await getCachedSubjects();
        const target = findTargetSubject(subjects, subjectCode);
        return target;
    } catch (e) {
        return undefined;
    }
}

// Helper to map raw rows to student objects with optimized header matching
function mapRowsToStudents(rows: any[][], subject: string, config?: any): any[] {
  if (rows.length === 0) return [];

  // Determine header row index (0-based)
  const headerRowIndex = (config?.headerRow || 1) - 1;
  if (headerRowIndex >= rows.length) return [];

  const headers = rows[headerRowIndex];
  const data = rows.slice(headerRowIndex + 1);
  
  // Pre-compute header column indices for faster lookups
  const headerIndices = new Map<string, number>();
  const criteriaIndices = {
    ethics: -1,
    codeUnderstanding: -1,
    reflection: -1,
  };
  
  headers.forEach((h: string, idx: number) => {
    const lowerH = String(h).toLowerCase();
    headerIndices.set(lowerH, idx);
    if (REGEX_PATTERNS.ethicsColumn.test(h)) criteriaIndices.ethics = idx;
    if (REGEX_PATTERNS.codeUnderstandingColumn.test(h)) criteriaIndices.codeUnderstanding = idx;
    if (REGEX_PATTERNS.reflectionColumn.test(h)) criteriaIndices.reflection = idx;
  });

  const isCriteriaBasedFormat =
    criteriaIndices.ethics !== -1 ||
    criteriaIndices.codeUnderstanding !== -1 ||
    criteriaIndices.reflection !== -1;
  
  const idIndex = resolveIdColumnIndex(headers, subject, config);
  
  // ITCS123 Auto-detect column indices by header matching
  let itcs123Indices = { name: -1, surname: -1, nickname: -1, email: -1 };
  if (subject === 'ITCS123') {
      // Try to find columns by header names
      headers.forEach((h: string, idx: number) => {
          const lowerH = String(h).toLowerCase();
          if (lowerH === 'name' || lowerH === 'firstname') itcs123Indices.name = idx;
          if (lowerH === 'lastname' || lowerH === 'surname') itcs123Indices.surname = idx;
          if (lowerH === 'nickname') itcs123Indices.nickname = idx;
          if (lowerH === 'email') itcs123Indices.email = idx;
      });
  }

  // Compile custom regex once
  let customRegex: RegExp | null = null;
  if (config?.columnPattern) {
      try {
          const patternStr = config.columnPattern.replace('{labId}', '(\\d+)').replace('{questionId}', '(\\w+)');
          customRegex = new RegExp(patternStr, 'i');
      } catch (e) {
        // Invalid pattern, skip
      }
  }

  return data.map((row: any[]) => {
    const rawUsername = row[idIndex];
    const student: any = { username: rawUsername ? String(rawUsername).trim() : "" };
    
    // Subject-specific name extraction
    if (subject === 'ITCS123') {
        // Use auto-detected indices or fallback
        student['name'] = itcs123Indices.name !== -1 ? fixMashedName(row[itcs123Indices.name]) : '';
        student['surname'] = itcs123Indices.surname !== -1 ? fixMashedName(row[itcs123Indices.surname]) : '';
        student['nickname'] = itcs123Indices.nickname !== -1 ? row[itcs123Indices.nickname] : '';
        student['email'] = itcs123Indices.email !== -1 ? row[itcs123Indices.email] : '';
    } else if (subject === 'ITCS223') {
        student['name'] = fixMashedName(row[2]);
        student['surname'] = fixMashedName(row[3]);
    } else if (subject === 'ITCS251' || subject === 'ITCS255') {
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
        student['name'] = fixMashedName(row[2]);
        student['surname'] = fixMashedName(row[3]);
    }
    
    let lastLabNumber: string | null = null;

    // Process headers with pre-computed indices
    headers.slice(idIndex + 1).forEach((header: string, relativeIndex: number) => {
         const trueIndex = idIndex + 1 + relativeIndex;
         const cellValue = row[trueIndex];
         if (!header) return;

         // 1. Custom Regex Match
         if (customRegex) {
             const match = String(header).match(customRegex);
             if (match && match[1]) {
                 student[header] = cellValue;
                 lastLabNumber = match[1];
                 return;
             }
         }

        // 2. Legacy/Hardcoded Matchers using pre-compiled regexes
        const wMatch = header.match(REGEX_PATTERNS.weekNumber);
        const match = header.match(REGEX_PATTERNS.labNumber);
        const chMatch = header.match(REGEX_PATTERNS.challengeNumber);
        
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
        } else if (REGEX_PATTERNS.labQuestionFormat.test(header)) {
             student[header] = cellValue;
        } else if (REGEX_PATTERNS.feedbackColumn.test(header)) {
             student[header] = cellValue;
        } else if (REGEX_PATTERNS.nameColumn.test(header)) {
             if (!student['name']) student['name'] = fixMashedName(cellValue);
        } else if (REGEX_PATTERNS.surnameColumn.test(header)) {
             if (!student['surname']) student['surname'] = fixMashedName(cellValue);
        } else if (REGEX_PATTERNS.totalColumn.test(header)) {
             student['total'] = cellValue;
             const match = header.match(/\((\d+)\)/);
             if (match) student['max_score'] = match[1];
        } else if (header === 'Ethics' || header === 'Code Understanding' || header === 'Reflection') {
             if (config?.currentLabNumber) {
               const labKey = `Lab ${config.currentLabNumber} ${header}`;
               student[labKey] = cellValue;
             } else {
               student[header] = cellValue;
             }
        } else if (REGEX_PATTERNS.inClassColumn.test(header)) {
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

/** Tabs to scan for student IDs (one roster tab is enough for tab-per-lab). */
function resolveTabsForStudentIds(subject: string, config?: any): string[] {
  if (config?.dataSourceType === 'tab_per_lab') {
    if (config?.sheetTabs) {
      const tabs = config.sheetTabs.split(',').map((t: string) => t.trim()).filter(Boolean);
      return tabs.length > 0 ? [tabs[0]] : ['Lab1'];
    }
    return ['Lab1'];
  }

  const isMultiSection =
    config?.dataSourceType === 'tab_per_section' ||
    subject === 'ITCS123' ||
    subject === 'ITCS223' ||
    subject === 'ITDS283';

  if (isMultiSection) {
    if (config?.sheetTabs) {
      return config.sheetTabs.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    if (subject === 'ITCS123') return ['Sec1', 'Sec2', 'Sec3'];
    if (subject === 'ITCS223') return ['Section 1', 'Section 2', 'Section 3'];
    if (subject === 'ITDS283') return ['Section 1', 'Section 2'];
    return ['Sec1', 'Sec2'];
  }

  return [config?.singleSheetTabName || 'score', 'Score', 'lab', 'Sheet1', subject];
}

function extractPrefixesFromIdColumn(rows: any[][]): string[] {
  const prefixSet = new Set<string>();
  for (const row of rows) {
    const id = String(row?.[0] ?? '').trim().replace(/^[uU]/, '');
    if (id.length >= 4 && /^\d{4}/.test(id)) {
      prefixSet.add(id.substring(0, 4));
    }
  }
  return Array.from(prefixSet).sort();
}

/**
 * Fast path for /api/student-prefixes — reads only the student ID column, not full scores.
 */
export async function getStudentIdPrefixes(
  subject: string,
  bypassCache: boolean = false
): Promise<string[]> {
  const cacheKey = `prefixes_${subject}`;
  if (!bypassCache) {
    const cached = sheetsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PREFIX_CACHE_TTL) {
      return cached.data as string[];
    }
  }

  const config = await getSubjectConfig(subject);
  const spreadsheetId = await getSubjectSheetId(subject);
  const sheets = await getSheetsClient();
  const tabs = resolveTabsForStudentIds(subject, config);

  const headerRow = (subject === 'ITCS251' || subject === 'ITCS255')
    ? (config?.headerRow || 5)
    : (config?.headerRow || 1);
  const dataStartRow = headerRow + 1;

  const configuredCol = config?.studentIdColumn?.trim();
  let idColLetter =
    configuredCol && /^[A-Za-z]+$/.test(configuredCol)
      ? configuredCol.toUpperCase()
      : null;

  const resolvedTabs: string[] = [];
  for (const tab of tabs) {
    try {
      resolvedTabs.push(
        await resolveTabNameForSpreadsheet(spreadsheetId, tab, [subject, 'Sheet1'])
      );
    } catch {
      // skip invalid tab name
    }
  }

  if (!idColLetter && resolvedTabs.length > 0) {
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${resolvedTabs[0]}!A${headerRow}:ZZ${headerRow}`,
    });
    const headers = headerRes.data.values?.[0] || [];
    const idIndex = resolveIdColumnIndex(headers, subject, config);
    idColLetter = getColumnLetter(idIndex + 1);
  }

  if (!idColLetter) {
    idColLetter = 'A';
  }

  const prefixSet = new Set<string>();

  await Promise.all(
    resolvedTabs.map(async (targetTab) => {
      try {
        const range = `${targetTab}!${idColLetter}${dataStartRow}:${idColLetter}1000`;
        const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        extractPrefixesFromIdColumn(res.data.values || []).forEach((p) => prefixSet.add(p));
      } catch {
        // skip failed tab
      }
    })
  );

  let prefixes = Array.from(prefixSet).sort();

  // Robust Fallback: If lightweight column scanning returned 0 prefixes, read via mapRowsToStudents / getSheetData
  if (prefixes.length === 0) {
    try {
      const fullData = await getSheetData(subject, undefined, bypassCache);
      if (fullData && fullData.length > 0) {
        const studs = mapRowsToStudents(fullData, subject, config);
        const fallbackSet = new Set<string>();
        studs.forEach((s: any) => {
          const id = String(s.username || '').trim().replace(/^[uU]/, '');
          if (id.length >= 4 && /^\d{4}/.test(id)) {
            fallbackSet.add(id.substring(0, 4));
          }
        });
        prefixes = Array.from(fallbackSet).sort();
      }
    } catch (e) {
      // Fallback ignore error
    }
  }

  sheetsCache.set(cacheKey, { data: prefixes, timestamp: Date.now() });
  return prefixes;
}

// Main Score Fetching Logic - optimized for concurrency
export async function getAllScores(subject: string = 'Sheet1', bypassCache: boolean = false) {
  const config = await getSubjectConfig(subject);
  
  // Strategy: Tab per Lab (New) - parallelized fetching
  if (config?.dataSourceType === 'tab_per_lab') {
      let labTabs: string[] = [];
      
      try {
        if (config?.sheetTabs) {
          labTabs = config.sheetTabs.split(',').map((t: string) => t.trim());
        } else if (config?.tabPattern) {
          const { getAllLabs } = await import("./db");
          const labs = await getAllLabs(true, subject);
          labTabs = labs.map(lab => {
            const labNum = parseInt(lab.labNumber);
            return config.tabPattern.replace('{labId}', labNum.toString());
          });
        } else {
          const sheets = await getSheetsClient();
          const spreadsheetId = await getSubjectSheetId(subject);
          const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
          
          const allSheets = spreadsheetInfo.data.sheets || [];
          const labTabRegex = REGEX_PATTERNS.labTabPattern;
          labTabs = allSheets
            .map((sheet: any) => sheet.properties?.title || '')
            .filter((name: string) => labTabRegex.test(name))
            .sort((a: string, b: string) => {
              const aNum = parseInt(a.replace(/\D/g, '')) || 0;
              const bNum = parseInt(b.replace(/\D/g, '')) || 0;
              return aNum - bNum;
            });
        }
      } catch (error: any) {
        const { getAllLabs } = await import("./db");
        const labs = await getAllLabs(true, subject);
        
        if (labs.length > 0) {
          const patterns = [
            (num: number) => `Lab${num}`,
            (num: number) => `Lab ${num}`,
            (num: number) => `lab${num}`,
            (num: number) => `lab ${num}`,
          ];
          
          for (const pattern of patterns) {
            try {
              const testTabs = labs.map(lab => pattern(parseInt(lab.labNumber)));
              const testRows = await getSheetData(subject, testTabs[0], bypassCache);
              if (testRows.length > 0) {
                labTabs = testTabs;
                break;
              }
            } catch (e: any) {
              continue;
            }
          }
          
          if (labTabs.length === 0) {
            labTabs = ['Lab1', 'Lab2', 'Lab3', 'Lab4', 'Lab5'];
          }
        } else {
          labTabs = ['Lab1', 'Lab2', 'Lab3', 'Lab4', 'Lab5'];
        }
      }
      
      if (labTabs.length === 0) {
        return [];
      }
      
      // Fetch first tab for roster with fallback
      let baseStudents: any[] = [];
      for (const tabName of labTabs) {
        try {
          const rosterRows = await getSheetData(subject, tabName, bypassCache);
          if (rosterRows.length > 0) {
            baseStudents = mapRowsToStudents(rosterRows, subject, config);
            break;
          }
        } catch (e: any) {
          continue;
        }
      }
      
      if (baseStudents.length === 0) {
        return [];
      }
      
      // Create base map
      let allStudentsMap: Record<string, any> = {};
      baseStudents.forEach(student => {
        if (student.username) {
          allStudentsMap[student.username] = {
            username: student.username,
            name: student.name || '',
            surname: student.surname || '',
            LA: student.LA || '',
            Section: student.Section || '',
            total: '0'
          };
        }
      });
      
      // Fetch all lab tabs in parallel (optimized)
      const labDataResults = await Promise.all(labTabs.map(async (tabName, index) => {
          try {
              const rows = await getSheetData(subject, tabName, bypassCache);
              if (rows.length === 0) return [];
              const labNumMatch = tabName.match(/\d+/);
              const actualLabNum = labNumMatch ? labNumMatch[0] : String(index + 1);
              return mapRowsToStudents(rows, subject, { ...config, currentLabNumber: actualLabNum });
          } catch(e: any) {
              return [];
          }
      }));

      // Merge results efficiently
      labDataResults.flat().forEach(student => {
          if (!student.username || !allStudentsMap[student.username]) return;
          
          Object.keys(student).forEach(key => {
            if (key.startsWith('l') && key.includes('-q')) {
              allStudentsMap[student.username][key] = student[key];
            } else if (key === 'Ethics' || key === 'Code Understanding' || key === 'Reflection') {
              allStudentsMap[student.username][key] = student[key];
            } else if (key.match(/^Lab \d+ (Ethics|Code Understanding|Reflection)$/)) {
              allStudentsMap[student.username][key] = student[key];
            } else if (key.startsWith('Lab ')) {
              allStudentsMap[student.username][key] = student[key];
            }
          });
          
          if (student.total && student.total !== '0') {
            allStudentsMap[student.username].total = student.total;
          }
      });
      
      return Object.values(allStudentsMap);
  }

  // Strategy: Tab per Section - parallel fetching
  const isMultiSection = (config?.dataSourceType === 'tab_per_section') || 
                         (subject === 'ITCS123' || subject === 'ITCS223' || subject === 'ITDS283');
                         
  if (isMultiSection) {
      let tabs: string[] = [];
      
      if (config?.sheetTabs) {
          tabs = config.sheetTabs.split(',').map((t: string) => t.trim());
      } else {
          if (subject === 'ITCS123') tabs = ['Sec1', 'Sec2', 'Sec3'];
          else if (subject === 'ITCS223') tabs = ['Section 1', 'Section 2', 'Section 3'];
          else if (subject === 'ITDS283') tabs = ['Section 1', 'Section 2'];
          else tabs = ['Sec1', 'Sec2'];
      }

      // Try to fetch with initially configured tabs
      let promises = tabs.map(tab => 
        getSheetData(subject, tab, bypassCache).catch(e => [])
      );
      
      let results = await Promise.all(promises);
      let hasData = results.some(r => r.length > 0);

      // If no data found with default tabs, try to auto-detect available tabs
      if (!hasData) {
          try {
              const sheets = await getSheetsClient();
              const spreadsheetId = await getSubjectSheetId(subject);
              const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
              
              const allSheets = spreadsheetInfo.data.sheets || [];
              const allTabNames = allSheets.map((s: any) => s.properties?.title || '').filter((t: string) => t.length > 0);
              
              // Try all available tabs
              promises = allTabNames.map((tab: string) => 
                getSheetData(subject, tab, bypassCache).catch((e: any) => [])
              );
              
              results = await Promise.all(promises);
              tabs = allTabNames;
          } catch (e: any) {
              // Auto-detection failed, continue with original results
          }
      }
      
      let allStudents: any[] = [];
      
      results.forEach((rows, i) => {
          if (rows.length > 0) {
              const studs = mapRowsToStudents(rows, subject, config);
              const tabName = tabs[i];
              let secId = '-';
              
              // Remove the subject code (case-insensitive) to prevent matching digits in the course code (e.g. 123 in ITCS123)
              let searchName = tabName;
              const subIdx = tabName.toLowerCase().indexOf(subject.toLowerCase());
              if (subIdx !== -1) {
                  searchName = tabName.substring(0, subIdx) + tabName.substring(subIdx + subject.length);
              }
              
              const cleanSearch = searchName.trim().toLowerCase();
              // Only extract if there's actually a section-like name left and it's not a generic sheet
              if (cleanSearch && !cleanSearch.includes('sheet')) {
                  const secMatch = searchName.match(/\d+/);
                  secId = secMatch ? secMatch[0] : searchName.trim();
              }
              
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
        const nameMap: { [key: string]: { name: string, surname: string } } = {};
        
        for (let i = 1; i < nameRows.length; i++) {
          const row = nameRows[i];
          const id = row[0]?.toString().trim();
          const name = row[1]?.toString().trim();
          const surname = row[2]?.toString().trim();
          
          if (id && name && surname) {
            nameMap[id] = { name, surname };
          }
        }
        
        students = students.map(student => {
          const nameData = nameMap[student.username];
          if (nameData) {
            return { ...student, name: nameData.name, surname: nameData.surname };
          }
          return student;
        });
      }
    } catch (error) {
      // Failed to fetch name data, continue
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
      const labInt = parseRequestedLabNumber(labNumber) ?? labNumber;
      // If it's multi-question (e.g. L1-Q1), we might receive "L1-Q1" as labNumber.
      // If the pattern is "Lab {labId}", it won't suffice for question sub-parts unless pattern supports it.
      // We assume `labNumber` passed here IS the column header identifier or close to it.
  }
  
  // Legacy ITCS123 handling
  if (sheetName === 'ITCS123' && scoreType) {
    const labNumPadded = labNumber.padStart(2, '0');
    // Get max score from rubric if available, fallback to 2
    let maxScore = 2;
    if (config?.rubricLevels && Array.isArray(config.rubricLevels) && config.rubricLevels.length > 0) {
        maxScore = Math.max(...config.rubricLevels.map((l: any) => l.score || 0));
    }
    actualLabNumber = scoreType === 'lab' ? `Lab${labNumPadded} (${maxScore})` : `Ch${labNumPadded} (${maxScore})`;
  }
 else if (sheetName === 'ITDS283' && scoreType === 'challenge') {
    const labInt = (parseRequestedLabNumber(labNumber) ?? parseInt(labNumber, 10)).toString();
    actualLabNumber = `Ch${labInt}`;
  }

  // Determine Target Tabs
  const isSingleSheet = !config?.dataSourceType || config.dataSourceType === 'single_sheet';
  let targetTabs: string[] = isSingleSheet
    ? [config?.singleSheetTabName || sheetName]
    : [sheetName];
  
  // Strategy: Tab Per Lab
  if (config?.dataSourceType === 'tab_per_lab') {
      // Use configurable tab pattern or fallback to default
      const labInt = parseRequestedLabNumber(labNumber);
      if (labInt === null) return;
      
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
           
           const headerRowConfig = config?.headerRow ? config.headerRow - 1 : 0;
           const headerRowData = rows.length > headerRowConfig ? rows[headerRowConfig] : [];
           const { rowIndex: studentRow } = findStudentInRows(
             rows, username, headerRowConfig, headerRowData, sheetName, config
           );
           const exists = studentRow !== -1;
           
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
            throw new Error(
              `Cannot update uploaded Excel file (Drive permission denied). Share the file with ${GOOGLE_CLIENT_EMAIL} as Editor, or convert it to a native Google Sheet.`
            );
        }
        
        throw e;
    }
}

// Student lookup cache to avoid re-scanning rows for each update
const studentRowCache = new Map<string, { spreadsheetId: string, rowIndex: number, timestamp: number }>();
const STUDENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Internal helper for actual update logic - optimized for performance
async function updateSpecificTab(subject: string, tabName: string, username: string, labNumber: string, score: number, feedback?: string, isCsv: boolean = false, config?: any, inClass?: boolean) {
  const sheets = await getSheetsClient();
  const spreadsheetId = await getSubjectSheetId(subject);

  const resolvedTab = await resolveTabNameForSpreadsheet(spreadsheetId, tabName, [subject, 'Sheet1']);
  
  const rows = await getSheetData(subject, resolvedTab, false);
  
  const headerRow = (subject === 'ITCS251' || subject === 'ITCS255') ? 5 : (config?.headerRow || 1);
  const startRow = (subject === 'ITCS251' || subject === 'ITCS255') ? 5 : 1;
  const headerIdx = headerRow - startRow;

  let headers = (rows.length > headerIdx && rows[headerIdx]) ? rows[headerIdx] : [];
  
  if (!Array.isArray(headers)) {
    headers = [];
  }
  
  if (rows.length === 0) {
      headers = ['Username', `Lab ${labNumber}`, `Lab ${labNumber} Feedback`];
  }

  // Pre-compute header lowercase map for faster searching
  const headerLowerMap = new Map<string, number>();
  headers.forEach((h: string, idx: number) => {
    if (h) headerLowerMap.set(String(h).toLowerCase(), idx);
  });

  const requestedLabNum = parseRequestedLabNumber(labNumber);
  const labInt = requestedLabNum !== null ? requestedLabNum.toString() : '0';
  const labNumPad = requestedLabNum !== null ? requestedLabNum.toString().padStart(2, '0') : '00';

  let labIndex = findLabColumnIndex(headers, labNumber, subject, config);
  
  // Feedback Column
  let feedbackIndex = headers.findIndex((h: string) => h === `${labNumber} Feedback` || h === `Lab ${labInt} Feedback`);
  
  if (feedbackIndex === -1 && (subject === 'ITCS251' || subject === 'ITCS255')) {
      feedbackIndex = headers.findIndex((h: string) => h === `W ${labInt} Feedback`);
  }
  
  const pendingUpdates : any[] = [];
  const xlsxUpdates : { col: number, row: number, value: any }[] = [];

  // Add Header if missing
  if (labIndex === -1) {
      labIndex = headers.length; 
      let headerValue = inferLabColumnHeaderName(headers, labInt, labNumPad, labNumber);
      
      if (subject === 'ITDS283') {
          headerValue = `Lab${labNumPad}`;
      } else if (subject === 'ITCS251' || subject === 'ITCS255') {
          headerValue = `W ${labInt}`;
      }
      
      headers.push(headerValue);
      
      const headerUpdate = {
          range: `${resolvedTab}!${getColumnLetter(labIndex + 1)}${headerRow}`,
          values: [[headerValue]]
      };

      try {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: { valueInputOption: 'RAW', data: [headerUpdate] },
        });
      } catch (headerErr) {
        // Ignore if header row (Row 2) is protected in Google Sheets
      }
      xlsxUpdates.push({ col: labIndex + 1, row: headerRow, value: headerValue });
  }

  const idIndex = resolveIdColumnIndex(headers, subject, config);

  // Optimized student row finding with cache
  const cacheKey = `${spreadsheetId}_${resolvedTab}_${username}`;
  const cached = studentRowCache.get(cacheKey);
  let rowIndex = -1;
  
  if (cached && cached.spreadsheetId === spreadsheetId && (Date.now() - cached.timestamp < STUDENT_CACHE_TTL)) {
    if (cached.rowIndex < rows.length) {
      const row = rows[cached.rowIndex];
      const colsToCheck = [idIndex, 0, 1, 2].filter((c, i, a) => c >= 0 && a.indexOf(c) === i);
      if (colsToCheck.some((col) => col < row.length && studentIdsMatch(row[col], username))) {
        rowIndex = cached.rowIndex;
      }
    }
  }
  
  if (rowIndex === -1) {
    const found = findStudentInRows(rows, username, headerIdx, headers, subject, config);
    rowIndex = found.rowIndex;
    
    if (rowIndex !== -1) {
      studentRowCache.set(cacheKey, { 
        spreadsheetId, 
        rowIndex, 
        timestamp: Date.now() 
      });
    }
  }

  const isNewStudentRow = rowIndex === -1;
  if (isNewStudentRow) {
    rowIndex = rows.length;
  }

  const actualSheetRow = rowIndex + startRow;

  if (isNewStudentRow) {
    const newRow = new Array(Math.max(idIndex + 1, headers.length, labIndex + 1)).fill('');
    newRow[idIndex] = username;
    if (labIndex !== -1) newRow[labIndex] = score;

    if ((subject === 'ITCS251' || subject === 'ITCS255') && !isCsv && inClass !== undefined) {
      const nextColumnIndex = labIndex + 1;
      if (nextColumnIndex < headers.length) {
        const nextColumnHeader = headers[nextColumnIndex];
        if (nextColumnHeader && String(nextColumnHeader).toLowerCase().trim() === 'in-class') {
          newRow[nextColumnIndex] = inClass;
        }
      }
    }

    if (feedback !== undefined && feedbackIndex !== -1) {
      newRow[feedbackIndex] = feedback;
    }

    try {
      if (pendingUpdates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: { valueInputOption: 'RAW', data: pendingUpdates },
        });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${resolvedTab}!A:A`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [newRow] },
      });
      return;
    } catch (err: any) {
      if (isUnsupportedSpreadsheetDocumentError(err)) {
        newRow.forEach((val, idx) => {
          if (val !== '') {
            xlsxUpdates.push({ col: idx + 1, row: actualSheetRow, value: val });
          }
        });
        return await updateXlsxData(spreadsheetId, resolvedTab, xlsxUpdates);
      }
      const availableTabs = await listGoogleSheetTabNames(spreadsheetId).catch(() => undefined);
      throw formatSheetUpdateError(resolvedTab, err, availableTabs);
    }
  }

  const scoreRange = `${resolvedTab}!${getColumnLetter(labIndex + 1)}${actualSheetRow}`;

  pendingUpdates.push({
      range: scoreRange,
      values: [[score]]
  });
  xlsxUpdates.push({ col: labIndex + 1, row: actualSheetRow, value: score });
  
  // Special handling for ITCS251 and ITCS255
  if ((subject === 'ITCS251' || subject === 'ITCS255') && !isCsv && inClass !== undefined) {
    const nextColumnIndex = labIndex + 1;
    if (nextColumnIndex < headers.length) {
      const nextColumnHeader = headers[nextColumnIndex];
      if (nextColumnHeader && String(nextColumnHeader).toLowerCase().trim() === 'in-class') {
        pendingUpdates.push({
          range: `${resolvedTab}!${getColumnLetter(nextColumnIndex + 1)}${actualSheetRow}`,
          values: [[inClass]]
        });
        xlsxUpdates.push({ col: nextColumnIndex + 1, row: actualSheetRow, value: inClass });
      }
    }
  }
  
  // Feedback
  if (feedback !== undefined && feedbackIndex !== -1) {
      pendingUpdates.push({
          range: `${resolvedTab}!${getColumnLetter(feedbackIndex + 1)}${actualSheetRow}`,
          values: [[feedback]]
      });
      xlsxUpdates.push({ col: feedbackIndex + 1, row: actualSheetRow, value: feedback });
  }

  // Execute updates
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
       if (isUnsupportedSpreadsheetDocumentError(err)) {
           return await updateXlsxData(spreadsheetId, resolvedTab, xlsxUpdates);
       }
       if (isGridLimitsError(err)) {
         throw new Error(
           `Cannot write to row ${actualSheetRow} on tab "${resolvedTab}" (sheet has reached its row limit). ` +
           `Add a blank row at the bottom of the sheet or ask an admin to expand the grid.`
         );
       }
       const availableTabs = await listGoogleSheetTabNames(spreadsheetId).catch(() => undefined);
       throw formatSheetUpdateError(resolvedTab, err, availableTabs);
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
    const labInt = parseRequestedLabNumber(labNumber);
    
    // Determine possible tab names based on configuration
    let possibleTabNames: string[] = [];
    
    if (config?.tabPattern && labInt !== null) {
        // Use configured pattern
        possibleTabNames = [config.tabPattern.replace('{labId}', labInt.toString())];
    } else if (labInt !== null) {
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

// Helper function to update specific criteria columns in a tab - optimized
async function updateCriteriaInTab(subject: string, tabName: string, username: string, criteria: {[key: string]: number}) {
    const sheets = await getSheetsClient();
    const spreadsheetId = await getSubjectSheetId(subject);
    const config = await getSubjectConfig(subject);
    
    const rows = await getSheetData(subject, tabName);
    
    const headerRow = 1;
    const startRow = 1;
    const headerIdx = headerRow - startRow;
    
    let headers = rows.length > headerIdx ? rows[headerIdx] : [];
    
    // Pre-compute criteria column indices once
    const criteriaColumns: Record<string, number> = {
        'Ethics': headers.findIndex((h: any) => REGEX_PATTERNS.ethicsColumn.test(h)),
        'Code Understanding': headers.findIndex((h: any) => REGEX_PATTERNS.codeUnderstandingColumn.test(h)),
        'Reflection': headers.findIndex((h: any) => REGEX_PATTERNS.reflectionColumn.test(h))
    };
    
    const { rowIndex } = findStudentInRows(rows, username, headerIdx, headers, subject, config);
    
    if (rowIndex === -1) {
        return;
    }
    
    const actualSheetRow = rowIndex + startRow;
    
    const pendingUpdates: any[] = [];
    const xlsxUpdates: { col: number, row: number, value: any }[] = [];
    
    // Update each criteria score
    for (const [criteriaName, score] of Object.entries(criteria)) {
        const columnIndex = criteriaColumns[criteriaName];
        if (columnIndex !== -1) {
            const range = `${tabName}!${getColumnLetter(columnIndex + 1)}${actualSheetRow}`;
            pendingUpdates.push({
                range: range,
                values: [[score]]
            });
            xlsxUpdates.push({ col: columnIndex + 1, row: actualSheetRow, value: score });
        }
    }
    
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
        }
        return true;
    } catch (e: any) {
        if (isUnsupportedSpreadsheetDocumentError(e) && xlsxUpdates.length > 0) {
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
          const labIndex = findLabColumnIndex(headers, labNumber, subject);

          if (labIndex === -1) continue;

          const updates = [];
          const xlsxUpdates: any[] = [];

          const sectionIndex = subject === 'ITCS227' ? 5 : -1;
          const headerRowOffset = (subject === 'ITCS251' || subject === 'ITCS255') ? 4 : 0;

          for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              
              if (subject === 'ITCS227' && section && section !== 'all' && sectionIndex !== -1) {
                  const rowSection = String(row[sectionIndex] || '').trim();
                  if (rowSection !== section) {
                      continue;
                  }
              }
              
              const cellValue = row[labIndex];

              if (cellValue === undefined || cellValue === null || cellValue === '') {
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
                   if (isUnsupportedSpreadsheetDocumentError(err)) {
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

// Debug function to see available tabs and data in a Google Sheet
export async function debugSheetTabs(subject: string) {
  try {
    const spreadsheetId = await getSubjectSheetId(subject);
    const sheets = await getSheetsClient();
    
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const allSheets = spreadsheetInfo.data.sheets || [];
    
    console.log(`\n=== Debug: ${subject} (Sheet ID: ${spreadsheetId.substring(0, 20)}...) ===`);
    console.log(`Total tabs found: ${allSheets.length}\n`);
    
    for (const sheet of allSheets) {
      const tabName = sheet.properties?.title || 'UNKNOWN';
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${tabName}!A1:E5`,
        });
        
        const rows = response.data.values || [];
        console.log(`📄 Tab: "${tabName}"`);
        console.log(`   Rows: ${rows.length}`);
        if (rows.length > 0) {
          console.log(`   Header: ${rows[0].join(' | ')}`);
          if (rows.length > 1) {
            console.log(`   Sample: ${rows[1].join(' | ')}`);
          }
        }
      } catch (e: any) {
        console.log(`📄 Tab: "${tabName}" - ERROR: ${e.message}`);
      }
    }
  } catch (error: any) {
    console.error(`Debug failed for ${subject}:`, error.message);
  }
}
