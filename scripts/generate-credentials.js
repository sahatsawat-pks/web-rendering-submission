const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables from .env file in the root directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not defined in .env file');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

function generateCredential(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function processFile(filePath) {
  console.log(`\n📂 Processing file: ${path.basename(filePath)}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    
    if (lines.length < 2) {
      console.log('⚠️  File is empty or has no data rows');
      return;
    }

    // Assume header is the first line
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Find "Student ID" or similar column
    const idIndex = headers.findIndex(h => 
      h.toLowerCase().replace(/[^a-z]/g, '').includes('studentid') || 
      h.toLowerCase() === 'id'
    );
    
    if (idIndex === -1) {
      console.log(`❌ No 'Student ID' column found in header: [${headers.join(', ')}]`);
      console.log('   Expected headers like "Student ID", "studentId", or "ID"');
      return;
    }

    // Determine subject from filename (e.g., "ITCS123.csv" -> "ITCS123")
    // If filename doesn't look like a subject code, maybe prompt or start matching? 
    // For now, we assume the filename starts with the subject code.
    const filename = path.basename(filePath, '.csv');
    // Extract potential subject code (e.g. ITCS123)
    const subjectMatch = filename.match(/^([A-Z]{4}\d{3})/i);
    const subject = subjectMatch ? subjectMatch[0].toUpperCase() : filename.toUpperCase();
    
    console.log(`   Subject identified as: ${subject}`);

    let generatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(','); // Simple CSV split, might need regex for quoted fields
      if (parts.length <= idIndex) continue;
      
      const rawId = parts[idIndex].trim().replace(/^"|"$/g, '');
      // Clean ID - remove non-digits if necessary, or keep as is? 
      // Existing credentials show purely numeric "6788003".
      // Let's keep it somewhat loose but trim.
      const studentId = rawId;
           
      if (!studentId || studentId.length < 3) continue; // Skip empty/short IDs

      try {
        // Check if credential exists for this student AND subject
        const checkRes = await pool.query(
          'SELECT id, credential FROM credentials WHERE student_id = $1 AND subject = $2',
          [studentId, subject]
        );

        if (checkRes.rowCount > 0) {
          // Exists
          skippedCount++;
        } else {
          // Generate new
          let credential = generateCredential();
          
          // Ensure uniqueness of credential itself (optional but good)
          // Actually, credential string uniqueness across the whole table isn't strictly required by schema 
          // (only student_id+subject is unique, and student_id is unique per constraints in db.ts cleanup), 
          // but having unique credentials helps.
          // Let's simple try insert.
          
          await pool.query(
            'INSERT INTO credentials (student_id, credential, subject) VALUES ($1, $2, $3)',
            [studentId, credential, subject]
          );
          generatedCount++;
          // console.log(`      + Generated for ${studentId}: ${credential}`);
        }
      } catch (err) {
        console.error(`   ❌ Error processing ${studentId}:`, err.message);
        errorCount++;
      }
    }

    console.log(`   ✅ Query Complete:`);
    console.log(`      - New Credentials Generated: ${generatedCount}`);
    console.log(`      - Already Existing: ${skippedCount}`);
    console.log(`      - Errors: ${errorCount}`);

  } catch (err) {
    console.error(`❌ Failed to read or process file ${filePath}:`, err);
  }
}

async function main() {
  const scriptsDir = __dirname;
  const dataDir = path.join(scriptsDir, 'data');
  const emailSenderDir = path.join(scriptsDir, 'email_sender');

  console.log('🔍 Looking for CSV files...');
  
  // Collect all CSV files from scripts/data and scripts/email_sender
  const dirsToCheck = [dataDir, emailSenderDir, scriptsDir]; // priority: data -> email_sender -> scripts
  let csvFiles = [];

  for (const dir of dirsToCheck) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.csv'));
      files.forEach(f => {
        const fullPath = path.join(dir, f);
        // Avoid duplicates if we traverse same dir? (Unlikely with this list)
        if (!csvFiles.some(existing => existing === fullPath)) {
            csvFiles.push(fullPath);
        }
      });
    }
  }

  if (csvFiles.length === 0) {
    console.log('⚠️  No CSV files found.');
    console.log('   Please place your subject CSV files (e.g., ITCS123.csv) in one of the following folders:');
    console.log(`   - ${dataDir}`);
    console.log(`   - ${emailSenderDir}`);
    process.exit(0);
  }

  console.log(`✅ Found ${csvFiles.length} CSV files.`);
  
  try {
    for (const file of csvFiles) {
      await processFile(file);
    }
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
