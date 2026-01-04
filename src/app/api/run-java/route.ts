
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    let tempDir = '';
    
    try {
        const { code, input } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        // Create a unique temporary directory
        const uniqueId = uuidv4();
        tempDir = join(os.tmpdir(), `java-run-${uniqueId}`);
        await mkdir(tempDir, { recursive: true });

        // Extract the public class name from the code
        const classNameMatch = code.match(/public\s+class\s+(\w+)/);
        const className = classNameMatch ? classNameMatch[1] : 'Solution';
        
        // Write the Java file with the extracted class name
        const filePath = join(tempDir, `${className}.java`);
        await writeFile(filePath, code);

        // Compile
        try {
            await execAsync(`javac "${filePath}"`);
        } catch (compileError: any) {
             return NextResponse.json({ 
                error: 'Compilation Error', 
                output: compileError.stderr || compileError.message 
            });
        }

        // Write input to a file and redirect
        const inputPath = join(tempDir, 'input.txt');
        await writeFile(inputPath, input || '');
        
        try {
            // Run with timeout of 5 seconds to prevent infinite loops
            const { stdout, stderr } = await execAsync(`cd "${tempDir}" && java -cp . ${className} < input.txt`, { timeout: 5000 });
            
            return NextResponse.json({ 
                output: stdout, 
                error: stderr 
            });

        } catch (runError: any) {
             // If it timed out or crashed
             if (runError.killed) {
                 return NextResponse.json({ error: 'Runtime Error', output: 'Process timed out (Limit: 5s)' });
             }
             return NextResponse.json({ 
                 error: 'Runtime Error', 
                 output: runError.stderr || runError.message 
             });
        }

    } catch (error: any) {
        console.error('Java Execution Error:', error);
        return NextResponse.json({ error: 'Server Error', output: error.message }, { status: 500 });
    } finally {
        // Cleanup
        if (tempDir) {
            try {
               await rm(tempDir, { recursive: true, force: true });
            } catch (e) {
                console.error("Failed to cleanup temp dir:", e);
            }
        }
    }
}
