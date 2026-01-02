import { NextRequest, NextResponse } from "next/server";
import { listRepositoryFiles } from "@/lib/github";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const labNumber = searchParams.get("labNumber");
    const path = searchParams.get("path") || "";

    if (!username || !labNumber) {
      return NextResponse.json(
        { error: "Username and lab number are required" },
        { status: 400 }
      );
    }

    const result = await listRepositoryFiles(username, labNumber, path);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, files: result.files });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
