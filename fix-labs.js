const { Pool } = require('pg');

async function fixLabs() {
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
        
        console.log("Setting quiz_enabled = false for all Challenge labs...");
        const res = await client.query("UPDATE labs SET quiz_enabled = false WHERE lab_type = 'Challenge' RETURNING id, lab_number, subject");
        console.log(`Updated ${res.rowCount} Challenge labs to disable quiz.`);
        if (res.rowCount > 0) {
            console.table(res.rows);
        }
        
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

fixLabs();
