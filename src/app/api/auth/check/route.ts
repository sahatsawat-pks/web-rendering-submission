import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    return NextResponse.json({
      isAuthenticated: !!user,
      user
    });
  } catch (error) {
    return NextResponse.json({ isAuthenticated: false }, { status: 500 });
  }
}
