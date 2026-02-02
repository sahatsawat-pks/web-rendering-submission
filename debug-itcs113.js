// Debug script for ITCS113 score reading
const subject = 'ITCS123';
async function testScoreReading() {
  try {
    // 1. Check subject config
    console.log('=== Checking Subject Config ===');
    const configRes = await fetch(`http://localhost:3000/api/subjects?code=${subject}`);
    const configData = await configRes.json();
    console.log('Subject Config:', JSON.stringify(configData, null, 2));
    
    if (configData.subjects && configData.subjects.length > 0) {
      const subj = configData.subjects[0];
      console.log('\nColumn Pattern:', subj.column_pattern);
      console.log('Google Sheet ID:', subj.google_sheet_id);
    }
    
    // 2. Test fetching scores  
    console.log('\n=== Testing Score Fetch ===');
    const scoreRes = await fetch(`http://localhost:3000/api/scores?subject=${subject}`);
    const scoreData = await scoreRes.json();
    
    if (scoreData.students && scoreData.students.length > 0) {
      console.log('First student:', JSON.stringify(scoreData.students[0], null, 2));
      console.log('\nTotal students:', scoreData.students.length);
      
      // Check if l1-q1 keys exist
      const firstStudent = scoreData.students[0];
      const l1q1Keys = Object.keys(firstStudent).filter(k => k.match(/^l\d+-q\d+$/i));
      console.log('\nl1-qN keys found:', l1q1Keys);
    } else {
      console.log('No students found or error:', scoreData);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}
testScoreReading();