const { Pool } = require('pg');

async function checkITCS258() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        const result = await pool.query("SELECT code, title, color, icon FROM subjects WHERE code = 'ITCS258'");
        console.log('ITCS258 config:', result.rows);
        
        if (result.rows.length === 0) {
            console.log('ITCS258 not found, checking all subjects:');
            const allResult = await pool.query("SELECT code, title, color, icon FROM subjects ORDER BY code");
            console.log('All subjects:', allResult.rows);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkITCS258();