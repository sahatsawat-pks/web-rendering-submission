import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs/promises";

const execPromise = util.promisify(exec);

interface TestCase {
  id: string;
  name: string;
  description: string;
  testCode: string;
  subTaskId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { username, labNumber, subject, testCases } = await request.json();

    if (!username || !labNumber || !subject || !testCases) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create temporary directory for test execution
    const timestamp = Date.now();
    const testRunDir = path.join(process.cwd(), "tmp", "js-tests", `${username}_${labNumber}_${timestamp}`);
    await fs.mkdir(testRunDir, { recursive: true });

    // Path to student's submission
    const submissionPath = path.join(
      process.cwd(),
      "public",
      "submissions",
      subject,
      username,
      labNumber
    );

    try {
      // Check if submission exists
      await fs.access(submissionPath);
    } catch (e) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const results = [];

    // Execute each test case
    for (const testCase of testCases as TestCase[]) {
      try {
        // Create a test file for this specific test
        const testFilePath = path.join(testRunDir, `test_${testCase.id}.js`);
        
        // Wrap the test code in a proper module structure
        const wrappedTestCode = `
const path = require('path');
const fs = require('fs');

// Set the submission path
const SUBMISSION_PATH = ${JSON.stringify(submissionPath)};

// User's test code
${testCase.testCode}

// Execute the test and return result
(async () => {
  try {
    const result = await test();
    console.log(JSON.stringify(result));
  } catch (error) {
    console.log(JSON.stringify({
      pass: false,
      message: error.message || 'Test execution error'
    }));
  }
})();
`;

        await fs.writeFile(testFilePath, wrappedTestCode);

        // Execute the test with a timeout
        const timeout = 10000; // 10 seconds timeout
        const { stdout, stderr } = await execPromise(
          `node ${testFilePath}`,
          { 
            cwd: testRunDir,
            timeout,
            env: {
              ...process.env,
              SUBMISSION_PATH: submissionPath
            }
          }
        );

        // Parse the test result
        let testResult;
        try {
          const output = stdout.trim();
          const lastLine = output.split('\n').filter(line => line.trim()).pop() || '{}';
          testResult = JSON.parse(lastLine);
        } catch (parseError) {
          testResult = {
            pass: false,
            message: `Failed to parse test result: ${stdout || stderr}`
          };
        }

        results.push({
          id: testCase.id,
          name: testCase.name,
          status: testResult.pass ? 'pass' : 'fail',
          message: testResult.message || (testResult.pass ? 'Test passed' : 'Test failed')
        });

      } catch (error: any) {
        // Handle execution errors (timeout, runtime errors, etc.)
        let errorMessage = 'Test execution failed';
        
        if (error.killed) {
          errorMessage = 'Test timeout - execution took too long';
        } else if (error.stderr) {
          errorMessage = `Runtime error: ${error.stderr}`;
        } else if (error.message) {
          errorMessage = error.message;
        }

        results.push({
          id: testCase.id,
          name: testCase.name,
          status: 'fail' as const,
          message: errorMessage
        });
      }
    }

    // Clean up test directory
    try {
      await fs.rm(testRunDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("Failed to clean up test directory:", cleanupError);
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error("Test runner error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "An error occurred during test execution" 
      },
      { status: 500 }
    );
  }
}
