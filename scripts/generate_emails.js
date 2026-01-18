const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'merged_for_word.csv');

if (!fs.existsSync(csvPath)) {
    console.error("Merged CSV not found.");
    process.exit(1);
}

// Helper to construct email
function constructEmail(name, surname) {
    if (!name || !surname) return '';
    
    // Clean strings: Remove excess whitespace, lowercase
    const cleanName = name.trim().toLowerCase().split(' ')[0]; // Take first name if multiple?
    const cleanSurname = surname.trim().toLowerCase();
    
    // Rule: name.sur(first 3)@...
    // Only take first 3 chars of surname
    const surPrefix = cleanSurname.substring(0, 3);
    
    return `${cleanName}.${surPrefix}@student.mahidol.ac.th`;
}

console.log("Generating emails...");

const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split(/\r?\n/);
let header = lines[0];
const headerParts = header.split(',');

// Find indices
const idIndex = headerParts.findIndex(h => h.trim().toLowerCase().includes('student id') || h.trim().toLowerCase() === 'id');
const nameIndex = headerParts.findIndex(h => h.trim().toLowerCase() === 'name');
const surnameIndex = headerParts.findIndex(h => h.trim().toLowerCase() === 'surname');

// Check/Add Email Column
let emailIndex = headerParts.findIndex(h => h.trim().toLowerCase() === 'email');
if (emailIndex === -1) {
    header += ',Email';
    emailIndex = headerParts.length;
}

const newLines = [header];
let generatedCount = 0;

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const cleanParts = parts.map(p => p ? p.replace(/^,|,$/g, '').trim().replace(/^"|"$/g, '') : '');
    
    const name = nameIndex !== -1 ? cleanParts[nameIndex] : '';
    const surname = surnameIndex !== -1 ? cleanParts[surnameIndex] : '';
    
    let currentEmail = (emailIndex < cleanParts.length) ? cleanParts[emailIndex] : '';
    
    // Logic: Only generate if missing? Or overwrite all to be consistent?
    // User said "I want only student ID who didn't have email... okay email format is..."
    // Implies filling in the missing ones.
    
    if (!currentEmail || currentEmail === '') {
        const generated = constructEmail(name, surname);
        if (generated) {
            currentEmail = generated;
            generatedCount++;
        }
    }
    
    // Reconstruct
    const rowData = [...cleanParts];
    while (rowData.length <= emailIndex) rowData.push('');
    rowData[emailIndex] = currentEmail;
    
    // Join
    const newLine = rowData.map(p => (p && p.includes(',')) ? `"${p}"` : p).join(',');
    newLines.push(newLine);
}

fs.writeFileSync(csvPath, newLines.join('\n'));
console.log(`✅ Generated emails for ${generatedCount} students.`);
console.log(`   Format: name.sur(3chars)@student.mahidol.ac.th`);
