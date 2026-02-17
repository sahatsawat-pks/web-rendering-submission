require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Running migration: 017_update_uniform_lab_score_default.sql');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations/017_update_uniform_lab_score_default.sql'),
      'utf8'
    );

    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
    console.log('📊 Updated use_uniform_lab_score default to TRUE for all subjects');
    
    // Verify the data
    const result = await pool.query('SELECT code, title, use_uniform_lab_score FROM subjects ORDER BY display_order');
    console.log('\n📋 Current subjects uniform scoring status:');
    result.rows.forEach(row => {
      console.log(`  ${row.code} - ${row.title}: ${row.use_uniform_lab_score ? 'Uniform /2' : 'Variable scoring'}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
