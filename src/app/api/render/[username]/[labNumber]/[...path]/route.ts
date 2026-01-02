import { NextRequest, NextResponse } from "next/server";
import { fetchRawRepositoryFile } from "@/lib/github";
import mime from "mime-types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; labNumber: string; path: string[] }> }
) {
  try {
    const { username, labNumber, path } = await params;
    const filePath = path.join("/");
    
    // Security check: prevent escaping the repository root
    if (filePath.includes("..")) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    const result = await fetchRawRepositoryFile(username, labNumber, filePath);

    if (!result.success || !result.content) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Determine content type
    const contentType = mime.lookup(filePath) || "application/octet-stream";

    console.log(`[Render] Serving ${filePath}`);
    console.log(`[Render] Content-Type: ${contentType}`);
    console.log(`[Render] Size: ${result.content.length} bytes`);
    console.log(`[Render] Preview: ${result.content.toString("utf-8").substring(0, 100)}...`);

    return new NextResponse(new Uint8Array(result.content), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });

  } catch (error) {
    console.error("Render error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
