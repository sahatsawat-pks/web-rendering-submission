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
            "SELECT id, lab_number, title, lab_type, subject, quiz_enabled, LENGTH(quiz_questions) as questions_len, quiz_questions FROM labs ORDER BY subject, lab_number, lab_type"
        );
        console.log("All Labs Quiz Data across all subjects:");
        res.rows.forEach(row => {
            let numQuestions = 0;
            if (row.quiz_questions) {
                try {
                    numQuestions = JSON.parse(row.quiz_questions).length;
                } catch (e) {
                    numQuestions = -1;
                }
            }
            if (row.quiz_enabled || numQuestions > 0) {
                console.log(`${row.subject} Lab ${row.lab_number} (${row.lab_type}): Enabled=${row.quiz_enabled}, QuestionsCount=${numQuestions}, ID=${row.id}`);
            }
        });
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

inspect();
