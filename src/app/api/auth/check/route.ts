import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    return NextResponse.json({
      isAuthenticated: !!user,
      user
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json({ isAuthenticated: false }, { status: 500 });
  }
}
