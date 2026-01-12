// Migration script to transfer credentials from database.json to PostgreSQL
const fs = require('fs');
const { Pool } = require('pg');

// Load environment variables from .env file
require('dotenv').config();

async function migrate() {
  // Read database.json
  console.log('📖 Reading database.json...');
  const data = JSON.parse(fs.readFileSync('database.json', 'utf-8'));
  
  if (!data.credentials || data.credentials.length === 0) {
    console.log('⚠️  No credentials found in database.json');
    return;
  }
  
  console.log(`✅ Found ${data.credentials.length} credentials to migrate`);
  
  // Connect to PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });
  
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    const client = await pool.connect();
    
    try {
      // Create table if not exists
      console.log('📋 Ensuring credentials table exists...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS credentials (
          id SERIAL PRIMARY KEY,
          student_id VARCHAR(50) NOT NULL,
          credential VARCHAR(10) NOT NULL,
          subject VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, subject)
        );
      `);
      
      // Start transaction
      await client.query('BEGIN');
      
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      
      console.log('📝 Migrating credentials...');
      
      for (const cred of data.credentials) {
        try {
          const result = await client.query(`
            INSERT INTO credentials (student_id, credential, subject, created_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (student_id, subject) 
            DO UPDATE SET 
              credential = EXCLUDED.credential,
              updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
          `, [cred.studentId, cred.credential, cred.subject, cred.createdAt || new Date().toISOString()]);
          
          if (result.rows[0].inserted) {
            inserted++;
          } else {
            updated++;
          }
        } catch (error) {
          console.error(`❌ Error migrating credential for ${cred.studentId}:`, error.message);
          skipped++;
        }
      }
      
      await client.query('COMMIT');
      
      console.log('\n✅ Migration complete!');
      console.log(`   📊 Statistics:`);
      console.log(`      - Inserted: ${inserted}`);
      console.log(`      - Updated: ${updated}`);
      console.log(`      - Skipped: ${skipped}`);
      console.log(`      - Total: ${data.credentials.length}`);
      
      // Verify
      const verifyResult = await client.query('SELECT COUNT(*) FROM credentials');
      console.log(`\n   🔍 Total credentials in database: ${verifyResult.rows[0].count}`);
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
