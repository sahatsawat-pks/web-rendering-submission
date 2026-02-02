/**
 * Database Inspection Script
 * Run this to check if labs exist in the database
 * 
 * Usage: node check-labs.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

async function checkLabs() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking database for labs...\n');
    
    const result = await pool.query('SELECT COUNT(*) as count FROM labs');
    const count = parseInt(result.rows[0].count);
    
    console.log(`📊 Total labs in database: ${count}\n`);
    
    if (count > 0) {
      const labsResult = await pool.query(`
        SELECT subject, lab_number, title, lab_type, is_active 
        FROM labs 
        ORDER BY subject, lab_number
      `);
      
      console.log('📋 Labs found:');
      console.log('─'.repeat(80));
      labsResult.rows.forEach(lab => {
        console.log(`${lab.subject.padEnd(10)} | Lab ${lab.lab_number.padEnd(3)} | ${lab.title.padEnd(30)} | ${lab.lab_type || 'Lab'}`);
      });
    } else {
      console.log('❌ No labs found in database!');
      console.log('💡 The seeding may not have run. Try:');
      console.log('   1. Stop your dev server');
      console.log('   2. Delete and recreate the database');
      console.log('   3. Restart the dev server');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLabs();
