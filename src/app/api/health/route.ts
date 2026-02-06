import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check environment variables
    const envChecks = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
    };

    // Quick database connectivity check
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }

    return NextResponse.json({
      status: "healthy",
      environment: envChecks,
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}