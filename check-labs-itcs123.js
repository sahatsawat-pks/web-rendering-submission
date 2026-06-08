
const { Pool } = require('pg');
require('dotenv').config();

async function checkLabs() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const res = await pool.query("SELECT lab_number, title, total_score FROM labs WHERE subject = 'ITCS123' ORDER BY lab_number");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkLabs();
