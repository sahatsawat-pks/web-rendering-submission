import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const execPromise = util.promisify(exec);

export async function POST(req: NextRequest) {
    let runDir = '';
    try {
        const { code, input } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        // 1. Create isolated temp directory
        const runId = uuidv4();
        const tmpDir = path.join(os.tmpdir(), 'python-runs');
        runDir = path.join(tmpDir, runId);
        
        await fs.mkdir(runDir, { recursive: true });

        // 2. Write code and input files
        await fs.writeFile(path.join(runDir, 'main.py'), code);
        
        // Handle input if provided
        const hasInput = input && input.length > 0;
        if (hasInput) {
            await fs.writeFile(path.join(runDir, 'input.txt'), input);
        }

        // 3. Execute with timeout
        // using python3 -u (unbuffered) to ensure stdout is captured immediately
        const command = hasInput 
            ? `python3 -u main.py < input.txt`
            : `python3 -u main.py`;

        try {
            const { stdout, stderr } = await execPromise(command, { 
                cwd: runDir,
                timeout: 5000, // 5 second timeout
                maxBuffer: 1024 * 1024 // 1MB output limit
            });

            return NextResponse.json({
                output: stdout,
                error: stderr
            });

        } catch (execError: any) {
            // Check for timeout
            if (execError.signal === 'SIGTERM' || execError.killed) {
                 return NextResponse.json({
                    error: 'Execution Timed Out (5s limit)',
                    output: execError.stdout || ''
                });
            }
            
            return NextResponse.json({
                output: execError.stdout || '',
                error: execError.stderr || execError.message || 'Runtime Error'
            });
        }

    } catch (error: any) {
        console.error('Local Python Execution Error:', error);
        return NextResponse.json(
            { error: 'Server Error', output: error.message },
            { status: 500 }
        );
    } finally {
        // 4. Cleanup
        if (runDir) {
            try {
                await fs.rm(runDir, { recursive: true, force: true });
            } catch (cleanupError) {
                console.error('Failed to cleanup run directory:', cleanupError);
            }
        }
    }
}
