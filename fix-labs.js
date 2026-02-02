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
        
        // 1. Fetch all labs for ITCS123 ordered by lab_number
        const res = await client.query("SELECT id, lab_number, title, lab_type FROM labs WHERE subject = 'ITCS123' ORDER BY lab_number, id");
        const labs = res.rows;
        
        let updates = 0;
        
        // 2. Iterate and identify duplicates
        // Assuming duplicates are adjacent or can be grouped by lab_number
        const grouped = {};
        for (const lab of labs) {
            if (!grouped[lab.lab_number]) grouped[lab.lab_number] = [];
            grouped[lab.lab_number].push(lab);
        }
        
        for (const [labNum, group] of Object.entries(grouped)) {
            if (group.length > 1) {
                // Check if we have two 'Lab' types
                const labTypes = group.map(l => l.lab_type);
                const allLabs = labTypes.every(t => t === 'Lab' || t === null);
                
                if (allLabs) {
                    // Update the second one to 'Challenge'
                    // We sort by ID, so usually the second created one is the challenge (or arbitrary)
                    const target = group[1]; // The second item
                    console.log(`Fixing Lab ${labNum}: ID ${target.id} -> Challenge`);
                    await client.query("UPDATE labs SET lab_type = 'Challenge' WHERE id = $1", [target.id]);
                    updates++;
                }
            }
        }
        
        console.log(`Fixed ${updates} labs.`);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

fixLabs();
