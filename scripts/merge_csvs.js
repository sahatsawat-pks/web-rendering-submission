const fs = require('fs');
const path = require('path');

async function mergeCsvFiles() {
  const dataDir = path.join(__dirname, 'data');
  const outputFilePath = path.join(__dirname, 'merged_for_word.csv');
  
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Data directory not found: ${dataDir}`);
    return;
  }

  const files = fs.readdirSync(dataDir).filter(f => f.toLowerCase().endsWith('.csv') && f.startsWith('universal_credentials_'));
  
  if (files.length === 0) {
    console.error('❌ No matching CSV files found in scripts/data/');
    return;
  }

  console.log(`Found ${files.length} CSV files to merge.`);

  let mergedLines = [];
  let header = '';
  let seenStudentIds = new Set();
  let duplicatesCount = 0;

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length === 0) continue;

    const currentHeader = lines[0];
    const dataLines = lines.slice(1);

    if (!header) {
      header = currentHeader;
    } 

    // Find Student ID index
    const headers = currentHeader.split(',');
    const idIndex = headers.findIndex(h => 
      h.toLowerCase().replace(/[^a-z]/g, '').includes('studentid') || 
      h.toLowerCase() === 'id'
    );
    
    // Find Source Subject index to remove
    const subjectIndex = headers.findIndex(h => 
      h.toLowerCase().replace(/[^a-z]/g, '').includes('sourcesubject')
    );

    if (idIndex === -1) {
        console.warn(`⚠️  Skipping ${file}: Could not find Student ID column.`);
        continue;
    }
    
    // Update main header to exclude subject if not done yet
    if (header === currentHeader && !header.includes('Processed')) {
        if (subjectIndex !== -1) {
            const headerParts = header.split(',');
            headerParts.splice(subjectIndex, 1);
            header = headerParts.join(',');
        }
    }

    for (const line of dataLines) {
        // Simple CSV parse handling quotes if needed
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        
        // Clean up parts
        const cleanParts = parts.map(p => p ? p.replace(/^,|,$/g, '').trim() : '');
        
        let studentId = cleanParts[idIndex];
        
        if (studentId) {
            studentId = studentId.replace(/^"|"$/g, '');
        }

        if (!studentId) continue;

        if (seenStudentIds.has(studentId)) {
            duplicatesCount++;
            continue;
        }

        seenStudentIds.add(studentId);
        
        // Remove the subject column if found
        if (subjectIndex !== -1 && parts.length > subjectIndex) {
            // Remove the element at subjectIndex (be careful if using strict split or regex match array)
            // If using regex match (parts), it includes the delimiters sometimes depending on regex.
            // My regex /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g does NOT include delimiter in the match itself usually, 
            // but the split(',') definitely doesn't.
            // Let's reconstruct the line without that part.
            
            // Actually, to be safe and clean, let's just use cleanParts and re-join, 
            // but we want to preserve original formatting/quotes if possible?
            // The prompt implies we just want the data.
            // Let's rely on reconstructing from cleanParts (maybe adding quotes back if needed) 
            // OR just splicing the `parts` array.
            
            // Let's use cleanParts to make a clean new CSV line.
            // We need to remove the item at subjectIndex.
            const newParts = [...cleanParts];
            newParts.splice(subjectIndex, 1);
            
            // Re-quote if necessary (contains comma)
            const newLine = newParts.map(p => p.includes(',') ? `"${p}"` : p).join(',');
            mergedLines.push(newLine);
        } else {
             mergedLines.push(line);
        }
    }
    console.log(`   + Processed ${file}`);
  }

  const finalContent = header + '\n' + mergedLines.join('\n');

  fs.writeFileSync(outputFilePath, finalContent);
  console.log(`\n✅ Successfully merged unique students into:`);
  console.log(`   📄 ${outputFilePath}`);
  console.log(`   📊 Total unique students: ${mergedLines.length}`);
  console.log(`   🗑️  Duplicates removed: ${duplicatesCount}`);
}

mergeCsvFiles();
