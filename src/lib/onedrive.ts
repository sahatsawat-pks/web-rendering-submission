import * as XLSX from 'xlsx';
import "isomorphic-fetch";
import { Client, ResponseType } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

// -- ENVIRONMENT VARIABLES FOR GRAPH --
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const DRIVE_ITEM_ID = process.env.ITCS223_DRIVE_ITEM_ID; // The ID of the Excel file
const DRIVE_ID = process.env.ITCS223_DRIVE_ID; // Optional if item ID is explicit, or "me/drive"

export interface StudentScore {
  no: string;
  studentId: string;
  name: string; // First Name
  surname: string; // Last Name
  section: string;
  labs: Record<string, { score: string; total: string }>;
  totalScore: string;
  totalMaxScore: string;
  percentage: string;
}

async function getGraphClient() {
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
        throw new Error("Missing Azure Graph Environment Variables (TENANT_ID, CLIENT_ID, CLIENT_SECRET)");
    }

    const credential = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ["https://graph.microsoft.com/.default"]
    });

    return Client.initWithMiddleware({ authProvider });
}

// ... Imports remain the same ...

// Extract Site Host and Path from URL
function parseSharePointUrl(url: string) {
    try {
        const u = new URL(url);
        const host = u.hostname; // e.g., studentmahidolac-my.sharepoint.com
        const pathParts = u.pathname.split('/');
        
        // Typical Personal URL: /personal/user_org_ac_th/Documents/...
        // Typical Site URL: /sites/sitename/Shared%20Documents/...
        
        let sitePath = "";
        // For Personal OneDrives (mysite)
        if (pathParts[1] === 'personal') {
            sitePath = pathParts.slice(0, 3).join('/'); // /personal/user_org_ac_th
        } else if (pathParts[1] === 'sites') {
            sitePath = pathParts.slice(0, 3).join('/'); // /sites/sitename
        } else {
            sitePath = ""; // Root site?
        }

        return { host, sitePath };
    } catch (e) {
        throw new Error("Invalid SharePoint URL");
    }
}

export async function getOneDriveScores(fileUrl: string): Promise<StudentScore[]> {
  try {
    // console.log("Initializing Graph Client...");
    const client = await getGraphClient();

    // Strategy 1: Use Drive Item ID directly if ENV is set
    let activeItemId = process.env.ITCS223_DRIVE_ITEM_ID;
    let activeDriveId = process.env.ITCS223_DRIVE_ID;

    // Strategy 2: URL Traversal (As described in blog)
    if (!activeItemId) {
        // console.log("Resolving path from URL...");
        const { host, sitePath } = parseSharePointUrl(fileUrl);
        
        // 1. Get Site ID
        // GET /sites/{host}:{server-relative-path}
        const siteReq = await client.api(`/sites/${host}:${sitePath}`).select('id').get();
        const siteId = siteReq.id;
        // console.log(`Found Site ID: ${siteId}`);

        // 2. Get Drives (Document Libraries)
        const drivesReq = await client.api(`/sites/${siteId}/drives`).select('id,name').get();
        // Assuming "Documents" is the target library (standard for personal and sites)
        const targetDrive = drivesReq.value.find((d: any) => d.name === 'Documents' || d.url?.includes('personal'));
        
        if (!targetDrive) throw new Error("Could not find 'Documents' drive.");
        activeDriveId = targetDrive.id;
        // console.log(`Found Drive ID: ${activeDriveId}`);

        // 3. Find File by Name (Traversal) or Search
        // We know the filename from URL "682_ITCS223_LabScore.xlsx"
        let filename = "682_ITCS223_LabScore.xlsx";
        const urlMatch = fileUrl.match(/file=([^&]+)/); // Extract filename query param if present
        if (urlMatch) filename = urlMatch[1];

        // Search in Drive
        const searchReq = await client.api(`/drives/${activeDriveId}/root/search(q='${filename}')`).select('id,name').get();
        if (searchReq.value && searchReq.value.length > 0) {
            activeItemId = searchReq.value[0].id;
            // console.log(`Found File ID via Search: ${activeItemId}`);
        } else {
            throw new Error(`Could not find file '${filename}' in drive.`);
        }
    }

    if (!activeDriveId || !activeItemId) {
         throw new Error("Unable to resolve Drive ID or Item ID.");
    }

    // console.log(`Fetching Excel Data from Item: ${activeItemId}`);
    
    // 4. Use Excel API to read Range Used
    // GET /drives/{drive-id}/items/{item-id}/workbook/worksheets
    const worksheetsReq = await client.api(`/drives/${activeDriveId}/items/${activeItemId}/workbook/worksheets`).get();
    
    const allScores: StudentScore[] = [];
    const targetSheets = ['Section1', 'Section2', 'Section3'];

    for (const sheet of worksheetsReq.value) {
        if (!targetSheets.includes(sheet.name)) continue;
        
        // console.log(`Processing Sheet: ${sheet.name}`);
        
        // Read Used Range
        const rangeReq = await client.api(`/drives/${activeDriveId}/items/${activeItemId}/workbook/worksheets('${sheet.name}')/usedRange(valuesOnly=true)`).get();
        const rawData = rangeReq.values; // Array of Arrays

        if (!rawData || rawData.length < 3) continue;

        // --- PREVIOUS PARSING LOGIC REUSED ---
        const headerRow = rawData[1] || []; 
        
        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const studentId = String(row[1] || '').trim();
            if (!studentId || !studentId.match(/^\d+$/)) continue; 

            const name = String(row[2] || '').trim();
            const surname = String(row[3] || '').trim();
            const labs: Record<string, { score: string; total: string }> = {};

            for (let col = 4; col < headerRow.length; col++) {
                const header = String(headerRow[col] || '').trim();
                if (header.toLowerCase().includes('lab') || header.toLowerCase().match(/^l\d+/)) {
                    const labNumMatch = header.match(/(\d+)/);
                    if (labNumMatch) {
                        const labNum = labNumMatch[1];
                        const rawScore = row[col];
                        let score = '0';
                        if (rawScore !== undefined && rawScore !== null && rawScore !== '') {
                            score = String(rawScore);
                        }
                        labs[labNum] = { score: score, total: '2' }; 
                    }
                }
            }

            const totalScoreVal = Object.values(labs).reduce((acc, curr) => acc + parseFloat(curr.score || '0'), 0);

            const studentObj: StudentScore = {
                no: (allScores.length + 1).toString(),
                studentId,
                name,
                surname,
                section: sheet.name,
                labs,
                totalScore: totalScoreVal.toFixed(2).replace(/\.00$/, ''),
                totalMaxScore: '22',
                percentage: ((totalScoreVal / 22) * 100).toFixed(1).replace(/\.0$/, '')
            };
            
            allScores.push(studentObj);
        }
    }

    return allScores;

  } catch (error: any) {
    console.error('Graph API Error:', error.message);
    throw new Error(`Graph API Failed: ${error.message}`);
  }
}
