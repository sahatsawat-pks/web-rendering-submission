const { Pool } = require('pg');

async function check() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL missing");
        return;
    }
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT id, lab_number, title, lab_type FROM labs WHERE subject = 'ITCS123' ORDER BY lab_number");
        console.table(res.rows);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
