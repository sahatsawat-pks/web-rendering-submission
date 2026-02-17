require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if column exists
    console.log('🔍 Checking if use_uniform_lab_score column exists...');
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'subjects' AND column_name = 'use_uniform_lab_score'
    `);

    if (checkResult.rows.length === 0) {
      console.log('📝 Column does not exist. Running migration 016 first...');
      const migration016 = fs.readFileSync(
        path.join(__dirname, 'migrations/016_add_use_uniform_lab_score.sql'),
        'utf8'
      );
      await pool.query(migration016);
      console.log('✅ Migration 016 completed: Column added with DEFAULT FALSE');
    } else {
      console.log('✅ Column already exists');
    }

    // Now run migration 017 to update default to TRUE
    console.log('\n🔄 Running migration: 017_update_uniform_lab_score_default.sql');
    const migration017 = fs.readFileSync(
      path.join(__dirname, 'migrations/017_update_uniform_lab_score_default.sql'),
      'utf8'
    );

    await pool.query(migration017);
    console.log('✅ Migration 017 completed successfully!');
    console.log('📊 Updated use_uniform_lab_score default to TRUE for all subjects');
    
    // Verify the data
    const result = await pool.query('SELECT code, title, use_uniform_lab_score FROM subjects ORDER BY display_order');
    console.log('\n📋 Current subjects uniform scoring status:');
    result.rows.forEach(row => {
      console.log(`  ${row.code} - ${row.title}: ${row.use_uniform_lab_score ? '✓ Uniform /2' : '✗ Variable scoring'}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
