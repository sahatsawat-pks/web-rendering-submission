
const { Pool } = require('pg');
require('dotenv').config();

async function checkRubric() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const res = await pool.query("SELECT code, rubric_levels FROM subjects WHERE code = 'ITCS123'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkRubric();
