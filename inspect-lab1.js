const { Pool } = require('pg');

async function inspect() {
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
        const res = await client.query(
            "SELECT id, lab_number, title, lab_type, quiz_enabled, quiz_questions, quiz_categories FROM labs WHERE subject = 'ITCS123' AND lab_number IN ('1', '01')"
        );
        console.log("Lab 1 Data:");
        console.log(JSON.stringify(res.rows, null, 2));
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

inspect();
