import { NextRequest, NextResponse } from 'next/server';

const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

export async function POST(req: NextRequest) {
    try {
        const { code, input } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        // Execute Python code using Piston API
        const response = await fetch(PISTON_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                language: 'python',
                version: '3.10.0',
                files: [
                    {
                        content: code,
                    },
                ],
                stdin: input || '',
            }),
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Execution service error', output: 'Failed to connect to execution service' },
                { status: 500 }
            );
        }

        const result = await response.json();

        // Check for runtime errors
        if (result.run && result.run.code !== 0) {
            return NextResponse.json({
                error: 'Runtime Error',
                output: result.run.stderr || result.run.output || 'Runtime error occurred',
            });
        }

        // Success - return output
        return NextResponse.json({
            output: result.run.stdout || result.run.output || '',
            error: result.run.stderr || '',
        });

    } catch (error: any) {
        console.error('Python Execution Error:', error);
        return NextResponse.json(
            { error: 'Server Error', output: error.message },
            { status: 500 }
        );
    }
}
