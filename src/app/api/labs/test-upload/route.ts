import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const labNumber = formData.get("labNumber") as string;
    const subject = formData.get("subject") as string;

    if (!file || !labNumber || !subject) {
      return NextResponse.json(
        { error: "File, labNumber, and subject are required" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".java")) {
        return NextResponse.json(
            { error: "Only .java files are allowed" },
            { status: 400 }
        );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save logic
    // Structure: src/tests/[subject]/lab[labNumber]/[filename]
    const testsDir = path.join(process.cwd(), "src", "tests", subject.toLowerCase(), `lab${labNumber}`);
    
    await mkdir(testsDir, { recursive: true });

    const filePath = path.join(testsDir, file.name);
    await writeFile(filePath, buffer);

    console.log(`Saved test file to ${filePath}`);

    return NextResponse.json({ success: true, filePath });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
