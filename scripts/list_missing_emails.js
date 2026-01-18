const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'merged_for_word.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split(/\r?\n/);

if (lines.length < 2) {
    console.log("CSV is empty or invalid.");
    process.exit(0);
}

const header = lines[0];
const headerParts = header.split(',');
const idIndex = headerParts.findIndex(h => h.trim().toLowerCase().includes('student id') || h.trim().toLowerCase() === 'id');
const emailIndex = headerParts.findIndex(h => h.trim().toLowerCase() === 'email');
const nameIndex = headerParts.findIndex(h => h.trim().toLowerCase() === 'name');
const surnameIndex = headerParts.findIndex(h => h.trim().toLowerCase() === 'surname');

if (idIndex === -1) {
    console.error("Could not find Student ID column");
    process.exit(1);
}

console.log(`Found ${lines.length - 1} total students.`);

const missing = [];

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple parse
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const cleanParts = parts.map(p => p ? p.replace(/^,|,$/g, '').trim().replace(/^"|"$/g, '') : '');
    
    const id = cleanParts[idIndex];
    const name = nameIndex !== -1 ? cleanParts[nameIndex] : '?';
    const surname = surnameIndex !== -1 ? cleanParts[surnameIndex] : '?';
    const email = (emailIndex !== -1 && emailIndex < cleanParts.length) ? cleanParts[emailIndex] : '';
    
    if (!email) {
        missing.push({ id, name, surname });
    }
}

console.log(`\n❌ Students missing email: ${missing.length}`);
if (missing.length > 0) {
    console.log(`\nNext 20 students without email:`);
    missing.slice(0, 20).forEach(s => {
        console.log(`- ${s.id} : ${s.name} ${s.surname}`);
    });
    
    const outPath = path.join(__dirname, 'missing_emails.txt');
    fs.writeFileSync(outPath, missing.map(s => `${s.id},${s.name},${s.surname}`).join('\n'));
    console.log(`\n📄 Full list saved to: ${outPath}`);
} else {
    console.log("✅ All students have emails!");
}
