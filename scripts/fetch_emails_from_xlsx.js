const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function fetchEmailsFromXlsx() {
  const xlsxPath = path.join(__dirname, 'data/EnglishScoreSummary.xlsx');
  const csvPath = path.join(__dirname, 'merged_for_word.csv');
  
  if (!fs.existsSync(xlsxPath)) {
    console.error("❌ Excel file not found: " + xlsxPath);
    return;
  }
  if (!fs.existsSync(csvPath)) {
    console.error("❌ CSV file not found: " + csvPath);
    return;
  }

  console.log("📖 Reading Excel file...");
  const workbook = XLSX.readFile(xlsxPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Find Header Row (Row 5 - index 5)
  const headerRowIndex = 5; 
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  let idColIndex = -1;
  let emailColIndex = -1;

  // Scan headers
  for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = sheet[XLSX.utils.encode_cell({r: headerRowIndex, c: C})];
      const val = cell ? String(cell.v).toLowerCase().trim() : '';
      
      if (val === 'id') idColIndex = C;
      if (val === 'student email') emailColIndex = C;
  }

  if (idColIndex === -1 || emailColIndex === -1) {
      console.error("❌ Could not find 'ID' or 'Student Email' columns in Row 6 of Excel.");
      return;
  }

  // Build Maps: StudentID -> Email AND Name+Surname -> Email
  const idMap = new Map();
  const nameMap = new Map();
  
  // Find Name column indices
  let nameColIndex = -1;
  let surnameColIndex = -1;
  
  for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = sheet[XLSX.utils.encode_cell({r: headerRowIndex, c: C})];
      const val = cell ? String(cell.v).toLowerCase().trim() : '';
      if (val === 'firstname' || val === 'name') nameColIndex = C;
      if (val === 'lastname' || val === 'surname') surnameColIndex = C;
  }

  let excelRows = 0;
  
  for (let R = headerRowIndex + 1; R <= range.e.r; ++R) {
      const idCell = sheet[XLSX.utils.encode_cell({r: R, c: idColIndex})];
      const emailCell = sheet[XLSX.utils.encode_cell({r: R, c: emailColIndex})];
      const nameCell = nameColIndex !== -1 ? sheet[XLSX.utils.encode_cell({r: R, c: nameColIndex})] : null;
      const surnameCell = surnameColIndex !== -1 ? sheet[XLSX.utils.encode_cell({r: R, c: surnameColIndex})] : null;

      if (emailCell) {
          const email = String(emailCell.v).trim();
          if (!email) continue;

          if (idCell) {
              const id = String(idCell.v).trim();
              if (id) idMap.set(id, email);
          }
          
          if (nameCell && surnameCell) {
              const name = String(nameCell.v).trim().toLowerCase();
              const surname = String(surnameCell.v).trim().toLowerCase();
              if (name && surname) {
                  nameMap.set(`${name} ${surname}`, email);
              }
          }
          excelRows++;
      }
  }
  console.log(`✅ Loaded ${excelRows} rows from Excel.`);
  console.log(`   Mapped ${idMap.size} IDs and ${nameMap.size} Names.`);

  // Read CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const csvLines = csvContent.split(/\r?\n/);
  
  if (csvLines.length < 2) return;

  // Process CSV Header
  let header = csvLines[0];
  const headerParts = header.split(',');
  
  // Find indices
  const idIndex = headerParts.findIndex(h => h.toLowerCase().replace(/[^a-z]/g, '').includes('studentid') || h.toLowerCase().trim() === 'id');
  const nameIndex = headerParts.findIndex(h => h.toLowerCase().trim() === 'name');
  const surnameIndex = headerParts.findIndex(h => h.toLowerCase().trim() === 'surname');

  let emailIndex = headerParts.findIndex(h => h.toLowerCase().trim() === 'email');
  
  if (idIndex === -1) {
       console.error("❌ Could not find Student ID column in CSV.");
       return;
  }

  // If Email column doesn't exist, append it
  if (emailIndex === -1) {
      header += ',Email';
      emailIndex = headerParts.length; // It will be the new last column
  }

  const newLines = [header];
  let updatedCount = 0;

  for (let i = 1; i < csvLines.length; i++) {
      const line = csvLines[i].trim();
      if (!line) continue;
      
      // Parse CSV line
      const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const cleanParts = parts.map(p => p ? p.replace(/^,|,$/g, '').trim().replace(/^"|"$/g, '') : '');
      
      const studentId = cleanParts[idIndex];
      const name = (nameIndex !== -1) ? cleanParts[nameIndex].toLowerCase() : '';
      const surname = (surnameIndex !== -1) ? cleanParts[surnameIndex].toLowerCase() : '';

      let currentEmail = (emailIndex < cleanParts.length) ? cleanParts[emailIndex] : '';
      
      // Look up new email
      let newEmail = idMap.get(studentId);
      
      // Try name match if ID fail
      if (!newEmail && name && surname) {
          newEmail = nameMap.get(`${name} ${surname}`);
      }

      if (newEmail) {
          if (!currentEmail || currentEmail !== newEmail) {
              currentEmail = newEmail;
              updatedCount++;
          }
      }
      
      // Reconstruct line
      // Use cleanParts for data up to existing columns, then update/add email
      const rowData = [...cleanParts];
      
      // Ensure rowData has enough slots if emailIndex was new
      while (rowData.length <= emailIndex) {
          rowData.push('');
      }
      
      rowData[emailIndex] = currentEmail;
      
      // Format back to CSV (quote if comma exists)
      const newLine = rowData.map((p, idx) => {
          // preserve existing quoting preference? or just quote if needed
          return (p && p.includes(',')) ? `"${p}"` : p;
      }).join(',');
      
      newLines.push(newLine);
  }

  fs.writeFileSync(csvPath, newLines.join('\n'));
  console.log(`✅ Updated CSV with emails from Excel.`);
  console.log(`   📧 Updated/Added ${updatedCount} emails.`);
}

fetchEmailsFromXlsx();
