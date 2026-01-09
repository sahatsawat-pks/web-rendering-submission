import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// SQL execution with proper database connection
// Note: This connects to a real PostgreSQL database for SQL testing

export async function POST(req: NextRequest) {
    let pool: Pool | null = null;
    
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
            matchMode = 'trim'
        } = body;

        if (!query) {
            return NextResponse.json({ error: 'No query provided' }, { status: 400 });
        }

        // Connect to database
        pool = new Pool({
            connectionString: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        let output = '';
        let error = '';
        let passed = false;

        try {
            // 1. Run database starter if provided
            if (databaseStarter) {
                await pool.query(databaseStarter);
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

        } catch (err: any) {
            error = err.message || 'SQL execution error';
            output = `Error: ${error}`;
        }

        return NextResponse.json({
            output,
            error,
            passed,
            testType
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
    }
}
