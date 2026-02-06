// Simple test script to verify database integration for lab max score
const { getSubjects } = require('./src/lib/db.ts');

async function testSubjectConfig() {
    try {
        console.log('Testing subject configuration...');
        const subjects = await getSubjects();
        
        console.log('Available subjects:');
        subjects.forEach(subject => {
            console.log(`- ${subject.code}: ${subject.name}`);
            console.log(`  Lab Weight: ${subject.labWeight || 'default (20)'}`);
            console.log(`  Lab Max Score: ${subject.labMaxScore || 'auto-calculate'}`);
            console.log('---');
        });
        
    } catch (error) {
        console.error('Error testing subject config:', error);
    }
}

testSubjectConfig();