
const { Pool } = require('pg');
require('dotenv').config();

async function checkSubject() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const res = await pool.query("SELECT code, lab_max_score, use_uniform_lab_score FROM subjects WHERE code = 'ITCS123'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSubject();
