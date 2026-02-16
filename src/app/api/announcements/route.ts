import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getAllAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET - List all announcements for a subject
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject")?.toUpperCase();

    if (!subject) {
      return NextResponse.json(
        { error: "Subject parameter is required" },
        { status: 400 }
      );
    }

    const announcements = await getAllAnnouncements(subject);

    return NextResponse.json({
      success: true,
      announcements,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error("Get announcements error:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

// POST - Create new announcement (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subject, title, message, createdBy } = body;

    if (!subject || !title || !message) {
      return NextResponse.json(
        { error: "Subject, title, and message are required" },
        { status: 400 }
      );
    }

    const announcement = await createAnnouncement(
      subject,
      title,
      message,
      createdBy || user.username
    );

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (error: any) {
    console.error("Create announcement error:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}

// DELETE - Delete announcement (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Announcement ID is required" },
        { status: 400 }
      );
    }

    await deleteAnnouncement(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Delete announcement error:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement" },
      { status: 500 }
    );
  }
}
