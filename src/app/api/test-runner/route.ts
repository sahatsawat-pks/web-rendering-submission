import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs/promises";

const execPromise = util.promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId, labNumber, code } = await request.json();

    if (!studentId || !labNumber || !code) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Setup Request Directory
    const timestamp = Date.now();
    const runDir = path.join(process.cwd(), "tmp", "runs", `${studentId}_${labNumber}_${timestamp}`);
    await fs.mkdir(runDir, { recursive: true });

    try {
        // 2. Locate Test File
        // Assumes tests are stored in src/tests/itcs123/lab[labNumber]
        // We need to find the .java file in that directory.
        const testDir = path.join(process.cwd(), "src", "tests", "itcs123", `lab${labNumber}`);
        
        let testFiles = [];
        try {
            testFiles = await fs.readdir(testDir);
        } catch (e) {
             return NextResponse.json({ error: `Test suite for Lab ${labNumber} not found.` }, { status: 404 });
        }

        const testFile = testFiles.find(f => f.endsWith(".java"));
        if (!testFile) {
            return NextResponse.json({ error: "No .java test file found for this lab." }, { status: 404 });
        }

        const testFilePath = path.join(testDir, testFile);
        const testFileName = testFile; // e.g. "Lab1Test.java"
        const testClassName = testFile.replace(".java", ""); // e.g. "Lab1Test"

        // 3. Write Student Code
        // WE need to know the expected class name for the student code.
        // For now, let's assume valid java class structure, parsing it might be complex.
        // Or we can ask user to provide filename?
        // Simpler approach: Regex to find "public class X"
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        let studentClassName = "Main";
        if (classMatch && classMatch[1]) {
            studentClassName = classMatch[1];
        } else {
             // Fallback or error?
             // If snippet, maybe wrap it? Let's assume full class for now.
        }

        const studentFilePath = path.join(runDir, `${studentClassName}.java`);
        await fs.writeFile(studentFilePath, code);

        // 4. Copy Test File to Run Dir
        await fs.copyFile(testFilePath, path.join(runDir, testFileName));

        // 5. Compile
        // Requires 'javac' in path and junit jar.
        // We need a path to junit.jar
        // For this environment, let's assume we might need to download it or it exists?
        // Let's assume a 'lib' folder has junit-platform-console-standalone.jar or similar.
        // IF NOT EXIST, we fail. 
        // For this specific environment, we will try to compile without classpath first if standard junit is installed, 
        // BUT usually we need the jar.
        // LET'S ASSUME a `lib/junit.jar` exists or similar. 
        // I will check for lib dir.
        
        const libDir = path.join(process.cwd(), "lib"); 
        // We'll proceed assuming there IS a jar, if not, we might need to ask user or fetch one.
        // Common name: junit-4.13.2.jar and hamcrest-core-1.3.jar OR junit-platform-console-standalone.jar
        
        // Command construction
        // javac -cp .:lib/* *.java
        const classpath = `.:${path.join(process.cwd(), "lib", "*")}`;
        
        await execPromise(`javac -cp "${classpath}" ${path.join(runDir, "*.java")}`, { cwd: runDir });

        // 6. Run Test
        // java -cp .:lib/* org.junit.runner.JUnitCore TestClassName
        const { stdout, stderr } = await execPromise(
            `java -cp "${classpath}" org.junit.runner.JUnitCore ${testClassName}`, 
            { cwd: runDir }
        );

        // 7. Parse Result
        // JUnit 4 updates stdout
        return NextResponse.json({ 
            success: true, 
            output: stdout,
            errorOutput: stderr
        });

    } catch (err: any) {
        console.error("Test execution failed:", err);
        return NextResponse.json({ 
            success: false, 
            error: "Execution failed", 
            details: err.message,
            stderr: err.stderr || ""
        });
    } finally {
        // Cleanup
        // await fs.rm(runDir, { recursive: true, force: true });
        // keeping it for debugging for now or comment out
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
