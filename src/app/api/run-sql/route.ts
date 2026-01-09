import { NextRequest, NextResponse } from 'next/server';

// For now, using a simple SQL validator/executor
// In production, you'd want to use a proper sandboxed SQL execution environment
// This is a placeholder that validates SQL syntax

export async function POST(req: NextRequest) {
    try {
        const { query, input } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'No query provided' }, { status: 400 });
        }

        // Basic SQL validation
        const sqlKeywords = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)/i;
        if (!sqlKeywords.test(query.trim())) {
            return NextResponse.json({
                error: 'Invalid SQL',
                output: 'Query must start with a valid SQL keyword (SELECT, INSERT, UPDATE, etc.)',
            });
        }

        // For demonstration purposes, return mock data
        // In production, you would execute against a real database with proper sandboxing
        const mockOutput = `Query executed successfully.
Note: This is a mock SQL executor for demonstration.
In production, this would execute against a real database.

Query: ${query.slice(0, 100)}${query.length > 100 ? '...' : ''}`;

        return NextResponse.json({
            output: mockOutput,
            error: '',
        });

    } catch (error: any) {
        console.error('SQL Execution Error:', error);
        return NextResponse.json(
            { error: 'Server Error', output: error.message },
            { status: 500 }
        );
    }
}
