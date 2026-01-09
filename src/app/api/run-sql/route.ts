import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// SQL execution with proper database connection
// Note: This connects to a real PostgreSQL database for SQL testing

// In-memory store for created databases per session
// Key: sessionId (studentId_labNumber), Value: database name
const sessionDatabases = new Map<string, string>();

export async function POST(req: NextRequest) {
    let pool: Pool | null = null;
    let createdDbPool: Pool | null = null;
    
    try {
        const body = await req.json();
        const { 
            query, 
            setupSql, 
            verificationSql, 
            cleanupSql,
            databaseStarter,
            testType = 'query_result',
            expectedOutput,
            matchMode = 'trim',
            sessionId, // studentId_labNumber to track database across tests
            isLastTest = false // Flag to indicate if this is the last test (cleanup database)
        } = body;

        if (!query) {
            return NextResponse.json({ error: 'No query provided' }, { status: 400 });
        }

        // Connect to default database for initial operations
        pool = new Pool({
            connectionString: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        let output = '';
        let error = '';
        let passed = false;
        let createdDatabase: string | null = null;

        try {
            // 1. Run database starter if provided (may include CREATE DATABASE)
            if (databaseStarter) {
                // Check if this creates a database
                const createDbMatch = databaseStarter.match(/CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`']?(\w+)["`']?/i);
                
                if (createDbMatch) {
                    const dbName = createDbMatch[1].toLowerCase();
                    
                    // Store in session if sessionId provided
                    if (sessionId) {
                        sessionDatabases.set(sessionId, dbName);
                        createdDatabase = dbName;
                    }
                    
                    // Execute CREATE DATABASE
                    await pool.query(databaseStarter);
                    
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
                } else {
                    await pool.query(databaseStarter);
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

            // 2. Run setup SQL if provided
            if (setupSql) {
                await pool.query(setupSql);
            }

            // 3. Run the main test query
            const result = await pool.query(query);
            
            // Format output based on test type
            if (testType === 'query_result') {
                // Format as rows
                if (result.rows && result.rows.length > 0) {
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
