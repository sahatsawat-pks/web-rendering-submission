import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAllScores, getSheetData } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const subject = searchParams.get('subject') || 'ITCS227';

    const rows = await getSheetData(subject);
    const headers = rows.length > 0 ? rows[0] : [];

    return NextResponse.json({ headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
