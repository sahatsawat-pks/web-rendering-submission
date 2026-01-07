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
    console.log('🔄 Running migration: 004_add_subjects_table.sql');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations/004_add_subjects_table.sql'),
      'utf8'
    );

    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
    console.log('📊 Subjects table created and populated with 7 subjects');
    
    // Verify the data
    const result = await pool.query('SELECT code, title, is_visible, display_order FROM subjects ORDER BY display_order');
    console.log('\n📋 Current subjects in database:');
    result.rows.forEach(row => {
      console.log(`  ${row.display_order}. ${row.code} - ${row.title} [${row.is_visible ? 'Visible' : 'Hidden'}]`);
    });
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Subjects table already exists');
      const result = await pool.query('SELECT code, title, is_visible, display_order FROM subjects ORDER BY display_order');
      console.log('\n📋 Current subjects in database:');
      result.rows.forEach(row => {
        console.log(`  ${row.display_order}. ${row.code} - ${row.title} [${row.is_visible ? 'Visible' : 'Hidden'}]`);
      });
    } else {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();
