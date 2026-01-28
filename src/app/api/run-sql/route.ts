import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Store session databases in memory (consider using Redis for production)
const sessionDatabases = new Map<string, string>();

export async function POST(req: NextRequest) {
    let pool: Pool | null = null;
    let createdDbPool: Pool | null = null;
    
    try {
        const { 
            query, 
            setupSql, 
            verificationSql, 
            cleanupSql, 
            databaseStarter,
            testType = 'query_result',
            expectedOutput,
            matchMode = 'trim',
            sessionId,
            isLastTest = false
        } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
        }

        // Helper to sanitize SQL for Postgres compatibility
        const sanitizeSql = (sql: string) => {
            if (!sql) return sql;
            return sql
                // Replace backticks with double quotes for identifiers
                // Replace backticks with double quotes for identifiers
                .replace(/`/g, '"')
                // Replace escaped single quotes \' with '' (standard SQL escape)
                // We use a lookbehind/lookahead or just simple replacement. 
                // Since this is a simple sanitization, global replace of \' -> '' is generally 99% correct for dumps.
                // We also handle \" to "
                .replace(/\\'/g, "''")
                .replace(/\\"/g, '"')
                
                // Remove MySQL specific comments
                .replace(/\/\*!.*?\*\//g, '')
                // Remove USE statements
                .replace(/^\s*USE\s+["']?[\w-]+["']?\s*(\s*;)?\s*$/gim, '') 
                .replace(/USE\s+["']?[\w-]+["']?\s*;/gi, '')
                
                // Remove MySQL-only LOCK/UNLOCK TABLES
                .replace(/LOCK TABLES\s+.*?;/gi, '')
                .replace(/UNLOCK TABLES;/gi, '')

                // Transform Integer types with display width (e.g., int(11), tinyint(4))
                // Note: We intentionally don't match DECIMAL(x,y) as that is valid in Postgres
                .replace(/\b(TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT)\s*\(\d+\)/gi, '$1')
                .replace(/\bTINYINT\b/gi, 'SMALLINT') // Postgres lacks tinyint
                .replace(/\bMEDIUMINT\b/gi, 'INTEGER') // Postgres lacks mediumint
                .replace(/\bDATETIME\b/gi, 'TIMESTAMP')
                .replace(/\bDOUBLE\b/gi, 'DOUBLE PRECISION')

                // Remove standalone KEY definitions in CREATE TABLE (e.g., KEY `idx` (`col`))
                // Keeping PRIMARY KEY and FOREIGN KEY (which usually start with CONSTRAINT)
                // We strictly target lines that start with KEY inside what we assume is a table def
                .replace(/,\s*KEY\s+["']?\w+["']?\s*\(.*?\)/gi, '')
                // Also catch invalid KEY at the start of a definition list (unlikely but possible)
                // .replace(/^\s*KEY\s+["']?\w+["']?\s*\(.*?\),?/gim, '') // Caution: Regex multiline matching can be tricky

                // Fix other MySQL syntax
                .replace(/AUTO_INCREMENT/gi, 'GENERATED ALWAYS AS IDENTITY')
                .replace(/\bUNSIGNED\b/gi, '') 
                .replace(/ENGINE=\w+/gi, '')
                .replace(/DEFAULT CHARSET=\w+/gi, '')
                .replace(/COLLATE=\w+/gi, '');
        };

        // Sanitize inputs
        const cleanQuery = sanitizeSql(query);
        const cleanSetup = setupSql ? sanitizeSql(setupSql) : undefined;
        const cleanVerify = verificationSql ? sanitizeSql(verificationSql) : undefined;
        const cleanCleanup = cleanupSql ? sanitizeSql(cleanupSql) : undefined;
        // Don't fully sanitize databaseStarter yet as we need to parse it for DB name
        
        let output = '';
        let error = '';
        let passed = false;
        let createdDatabase = '';

        try {
            // 1. Initialize database connection
            pool = new Pool({
                connectionString: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });

            // 1a. Handle database starter (CREATE DATABASE logic)
            // 1a. Handle database starter (CREATE DATABASE logic)
            if (databaseStarter) {
                // Sanitize starter checking for MySQL comments first
                const cleanStarter = sanitizeSql(databaseStarter);
                
                // Match regex against original or partially cleaned to find DB name
                // Looking for CREATE DATABASE identifiers (which might now have double quotes)
                const dbNameMatch = cleanStarter.match(/CREATE DATABASE\s+(?:IF NOT EXISTS\s+)?["']?([^\s;"']+)["']?/i);
                
                if (dbNameMatch) {
                    const dbName = dbNameMatch[1];
                    const fullDbMatch = dbNameMatch[0]; // The full "CREATE DATABASE ..." string
                    
                    // Store in session if sessionId provided
                    if (sessionId) {
                        sessionDatabases.set(sessionId, dbName);
                        createdDatabase = dbName;
                    }
                    
                    // 1. Execute just the CREATE DATABASE command specifically
                    // This avoids the "cannot run inside a transaction block" error
                    try {
                        // Attempt to create. If it fails (e.g. exists), we might catch error
                        // Postgres doesn't easily support "IF NOT EXISTS" in pure SQL in strict mode usually, 
                        // but if we parsed out the "IF NOT EXISTS" we might just try/catch unique violation
                        await pool.query(`CREATE DATABASE "${dbName}"`);
                    } catch (e: any) {
                        // ignore if database already exists error
                        if (e.code !== '42P04') { // 42P04 is duplicate_database
                             // console.log("DB Create info:", e.message);
                        }
                    }
                    
                    // Close default pool and connect to new database
                    await pool.end();
                    pool = null;
                    
                    // Get base connection string and replace database name
                    const baseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || '';
                    const urlParts = baseUrl.split('/');
                    urlParts[urlParts.length - 1] = dbName + (urlParts[urlParts.length - 1].includes('?') ? urlParts[urlParts.length - 1].substring(urlParts[urlParts.length - 1].indexOf('?')) : '');
                    const newDbUrl = urlParts.join('/');
                    
                    createdDbPool = new Pool({
                        connectionString: newDbUrl,
                        ssl: { rejectUnauthorized: false }
                    });
                    
                    // Use the new database pool for subsequent operations
                    pool = createdDbPool;

                    // 2. Prepare the REST of the script (Tables, etc.)
                    // Remove the CREATE DATABASE line we just ran
                    // And Remove "USE dbname" lines
                    const remainderScript = cleanStarter
                        .replace(/CREATE DATABASE\s+(?:IF NOT EXISTS\s+)?["']?[^\s;"']+["']?\s*(\s*;)?/i, '')
                        .replace(/^\s*USE\s+["']?[\w-]+["']?\s*(\s*;)?\s*$/gim, '')
                        .replace(/USE\s+["']?[\w-]+["']?\s*;/gi, '');

                    // Run the rest of the schema setup on the NEW database connection
                    if (remainderScript.trim()) {
                        await pool.query(remainderScript);
                    }

                } else {
                    // Fallback for scripts without CREATE DATABASE (just runs on default DB?? Unlikely for this use case but safe)
                    await pool.query(cleanStarter);
                }
            } else if (sessionId && sessionDatabases.has(sessionId)) {
                // If no database starter but we have a session database, connect to it
                const dbName = sessionDatabases.get(sessionId)!;
                
                await pool.end();
                pool = null;
                
                const baseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || '';
                const urlParts = baseUrl.split('/');
                urlParts[urlParts.length - 1] = dbName + (urlParts[urlParts.length - 1].includes('?') ? urlParts[urlParts.length - 1].substring(urlParts[urlParts.length - 1].indexOf('?')) : '');
                const newDbUrl = urlParts.join('/');
                
                createdDbPool = new Pool({
                    connectionString: newDbUrl,
                    ssl: { rejectUnauthorized: false }
                });
                
                pool = createdDbPool;
            }

            // Handle USE statements in main query if present (Postgres workaround)
            // If query starts with USE "dbname"; we might need to verify we are connected to it,
            // but since we handle connection above, we can likely just strip the USE statement for execution.
            // However, the student might use 'USE' mid-script which is tricky in Postgres.
            // For now, let's assume USE is at the start or handled by session logic.
            
            // 2. Run setup SQL if provided
            if (cleanSetup) {
                await pool.query(cleanSetup);
            }

            // 3. Run the main test query
            const result = await pool.query(cleanQuery);
            
            // Format output based on test type
            if (testType === 'query_result') {
                // Format as rows
                // Format as rows with headers
                if (result.fields && result.fields.length > 0) {
                    const headers = result.fields.map((f: any) => f.name).join('|');
                    
                    if (result.rows && result.rows.length > 0) {
                        const rows = result.rows.map((row: any) => 
                            Object.values(row).join('|')
                        ).join('\n');
                        output = `${headers}\n${rows}`;
                    } else {
                        output = `${headers}\n(No rows returned)`;
                    }
                } else if (result.rows && result.rows.length > 0) {
                     output = result.rows.map((row: any) => 
                        Object.values(row).join('|')
                    ).join('\n');
                } else {
                    output = '(No rows returned)';
                }
            } else if (testType === 'data_check') {
                // Run verification query if provided
                if (verificationSql) {
                    const verifyResult = await pool.query(verificationSql);
                    if (verifyResult.rows && verifyResult.rows.length > 0) {
                        output = verifyResult.rows.map((row: any) => 
                            Object.values(row).join('|')
                        ).join('\n');
                    } else {
                        output = '(No rows returned)';
                    }
                } else {
                    output = `Affected rows: ${result.rowCount || 0}`;
                }
            } else if (testType === 'structure_check') {
                // Run verification query for structure
                if (verificationSql) {
                    const verifyResult = await pool.query(verificationSql);
                    if (verifyResult.rows && verifyResult.rows.length > 0) {
                        output = JSON.stringify(verifyResult.rows, null, 2);
                    } else {
                        output = 'Structure verified';
                    }
                } else {
                    output = 'Query executed successfully';
                }
            }

            // 4. Check against expected output if provided
            if (expectedOutput) {
                const actualOutput = matchMode === 'trim' 
                    ? output.trim().replace(/\s+/g, ' ')
                    : output;
                const expected = matchMode === 'trim'
                    ? expectedOutput.trim().replace(/\s+/g, ' ')
                    : expectedOutput;
                
                passed = actualOutput === expected;
            } else {
                passed = true; // No expected output means just check for execution success
            }

            // 5. Run cleanup SQL if provided
            if (cleanupSql) {
                await pool.query(cleanupSql);
            }
            
            // 6. Cleanup database if this is the last test
            if (isLastTest && sessionId && sessionDatabases.has(sessionId)) {
                const dbName = sessionDatabases.get(sessionId)!;
                
                // Switch back to default database to drop the created one
                if (createdDbPool) {
                    await createdDbPool.end();
                    createdDbPool = null;
                }
                
                const defaultPool = new Pool({
                    connectionString: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
                    ssl: { rejectUnauthorized: false }
                });
                
                try {
                    // Terminate connections to the database
                    await defaultPool.query(`
                        SELECT pg_terminate_backend(pg_stat_activity.pid)
                        FROM pg_stat_activity
                        WHERE pg_stat_activity.datname = '${dbName}'
                        AND pid <> pg_backend_pid()
                    `);
                    
                    // Drop the database
                    await defaultPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
                } catch (dropErr) {
                    console.error('Error dropping database:', dropErr);
                } finally {
                    await defaultPool.end();
                }
                
                // Remove from session
                sessionDatabases.delete(sessionId);
            }

        } catch (err: any) {
            error = err.message || 'SQL execution error';
            output = `Error: ${error}`;
        }

        return NextResponse.json({
            output,
            error,
            passed,
            testType,
            createdDatabase // Return info about created database
        });

    } catch (error: any) {
        console.error('SQL Execution Error:', error);
        return NextResponse.json(
            { error: 'Server Error', output: error.message },
            { status: 500 }
        );
    } finally {
        if (pool) {
            await pool.end();
        }
        if (createdDbPool && createdDbPool !== pool) {
            await createdDbPool.end();
        }
    }
}

// Optional: Add cleanup endpoint to manually clear stuck databases
export async function DELETE(req: NextRequest) {
    try {
        const { sessionId } = await req.json();
        
        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }
        
        if (!sessionDatabases.has(sessionId)) {
            return NextResponse.json({ error: 'No database found for session' }, { status: 404 });
        }
        
        const dbName = sessionDatabases.get(sessionId)!;
        
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        try {
            // Terminate connections
            await pool.query(`
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '${dbName}'
                AND pid <> pg_backend_pid()
            `);
            
            // Drop database
            await pool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
            
            sessionDatabases.delete(sessionId);
            
            return NextResponse.json({ success: true, message: `Database ${dbName} dropped` });
        } finally {
            await pool.end();
        }
    } catch (error: any) {
        console.error('Database cleanup error:', error);
        return NextResponse.json(
            { error: 'Cleanup failed', message: error.message },
            { status: 500 }
        );
    }
}
