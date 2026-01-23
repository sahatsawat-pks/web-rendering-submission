import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const execPromise = util.promisify(exec);

const getPythonCommand = async () => {
    const commands = [
        'python3', 
        'python', 
        'py',
        '/usr/bin/python3',
        '/usr/local/bin/python3',
        '/opt/miniconda3/bin/python',
        '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3'
    ];
    
    const errors: string[] = [];
    
    for (const cmd of commands) {
        try {
            // If it's an absolute path, verify it exists first
            if (path.isAbsolute(cmd)) {
                try {
                    await fs.access(cmd);
                } catch (accessErr) {
                    errors.push(`${cmd}: File not found/access denied`);
                    continue;
                }
            }

            const { stdout } = await execPromise(`${cmd} --version`);
            return cmd;
        } catch (e: any) {
            errors.push(`${cmd}: ${e.message || e}`);
        }
    }
    
    const debugInfo = {
        pathEnv: process.env.PATH,
        user: process.env.USER,
        errors
    };
    
    console.error('Python detection failed:', debugInfo);
    throw new Error(`Python interpreter not found.\nDetails:\n${errors.join('\n')}\nPATH: ${process.env.PATH}`);
};

// Helper to run code via Piston API (Fallback)
const runRemoteExecution = async (code: string, input: string) => {
    console.log('Falling back to Piston Remote Execution...');
    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                language: 'python',
                version: '3.10.0',
                files: [
                    {
                        name: 'main.py',
                        content: code
                    }
                ],
                stdin: input || '',
                run_timeout: 5000,
                compile_timeout: 10000
            })
        });

        const result = await response.json();
        console.log('Piston Result:', result);

        if (result.message) {
             throw new Error(`Piston Error: ${result.message}`);
        }

        return NextResponse.json({
            output: result.run.stdout,
            error: result.run.stderr || (result.run.code !== 0 ? `Process exited with code ${result.run.code}` : '')
        });

    } catch (error: any) {
        console.error('Remote Execution Error:', error);
        return NextResponse.json({
            output: '',
            error: `Remote Execution Failed: ${error.message}`
        });
    }
};

export async function POST(req: NextRequest) {
    let runDir = '';
    try {
        const { code, input } = await req.json();

        console.log('API Request Received:', { codeLength: code?.length, inputLength: input?.length });

        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        // 3. Detect Python Command
        let pythonCmd = '';
        try {
            pythonCmd = await getPythonCommand();
            console.log('Using Python Command:', pythonCmd);
        } catch (detectionError) {
             console.warn('Local Python not found, switching to remote execution.', detectionError);
             return await runRemoteExecution(code, input);
        }

        // 1. Create isolated temp directory (Only needed for local execution)
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

        // Using -u (unbuffered)
        const command = hasInput 
            ? `${pythonCmd} -u main.py < input.txt`
            : `${pythonCmd} -u main.py`;

        try {
            const { stdout, stderr } = await execPromise(command, { 
                cwd: runDir,
                timeout: 5000, // 5 second timeout
                maxBuffer: 1024 * 1024 // 1MB output limit
            });

            console.log('Python Execution Result:', { runId, stdout, stderr });

            return NextResponse.json({
                output: stdout,
                error: stderr
            });

        } catch (execError: any) {
            // Check for timeout
            if (execError.signal === 'SIGTERM' || execError.killed) {
                 console.error('Python Execution Timed Out:', runId);
                 return NextResponse.json({
                    error: 'Execution Timed Out (5s limit)',
                    output: execError.stdout || ''
                });
            }
            
            console.error('Python Execution Runtime Error:', { runId, error: execError });
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
