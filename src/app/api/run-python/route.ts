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
    
    for (const cmd of commands) {
        try {
            await execPromise(`${cmd} --version`);
            return cmd;
        } catch (e) {
            continue;
        }
    }
    
    console.error('PATH env:', process.env.PATH);
    throw new Error('Python interpreter not found. Checked: ' + commands.join(', '));
};

export async function POST(req: NextRequest) {
    let runDir = '';
    try {
        const { code, input } = await req.json();

        console.log('API Request Received:', { codeLength: code?.length, inputLength: input?.length });

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

        // 3. Detect and Execute
        const pythonCmd = await getPythonCommand();
        console.log('Using Python Command:', pythonCmd);

        // using -u (unbuffered) to ensure stdout is captured immediately
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
