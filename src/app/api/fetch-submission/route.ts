import { NextRequest, NextResponse } from "next/server";
import { fetchRepositoryFile } from "@/lib/github";
import { getLabByNumber } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, labNumber } = body;

    // Validate input
    if (!username || !labNumber) {
      return NextResponse.json(
        { error: "Username and lab number are required" },
        { status: 400 }
      );
    }

    // Validate username format (basic GitHub username rules)
    const usernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "Invalid GitHub username format" },
        { status: 400 }
      );
    }

    // Get lab configuration to find the file name
    const lab = await getLabByNumber(labNumber);
    if (!lab) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      );
    }

    if (!lab.isActive) {
      return NextResponse.json(
        { error: "This lab is not currently active" },
        { status: 403 }
      );
    }

    // Fetch the file from GitHub
    const result = await fetchRepositoryFile(
      username,
      labNumber,
      lab.fileName
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      metadata: result.metadata,
      lab: {
        number: lab.labNumber,
        title: lab.title,
        fileName: lab.fileName,
      },
    });
  } catch (error: any) {
    console.error("Fetch submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
