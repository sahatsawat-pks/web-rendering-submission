const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'data/EnglishScoreSummary.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const range = XLSX.utils.decode_range(sheet['!ref']);

// Print first 10 rows to find the real header
for (let R = 0; R < 10; ++R) {
    const row = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = sheet[XLSX.utils.encode_cell({r: R, c: C})];
        row.push(cell ? cell.v : null);
    }
    console.log(`Row ${R}:`, JSON.stringify(row));
}
