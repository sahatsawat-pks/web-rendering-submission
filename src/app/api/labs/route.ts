import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getAllLabs,
  getLabById,
  createLab,
  updateLab,
  deleteLab,
} from "@/lib/db";

// GET - List all labs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const subject = searchParams.get("subject") || undefined;

    const labs = await getAllLabs(activeOnly, subject);

    return NextResponse.json({
      success: true,
      labs,
    });
  } catch (error: any) {
    console.error("Get labs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch labs" },
      { status: 500 }
    );
  }
}

// POST - Create new lab (admin only)
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
    const { labNumber, title, fileName, isActive, deadline, subject } = body;

    if (!labNumber || !title) {
      return NextResponse.json(
        { error: "Lab number and title are required" },
        { status: 400 }
      );
    }

    const lab = await createLab(
      labNumber,
      title,
      fileName || "index.html",
      subject, // Defaults to ITGE162 in db.ts if undefined, or we can enforce it.
      isActive !== undefined ? isActive : true,
      deadline
    );

    return NextResponse.json({
      success: true,
      lab,
    });
  } catch (error: any) {
    console.error("Create lab error:", error);
    return NextResponse.json(
      { error: "Failed to create lab" },
      { status: 500 }
    );
  }
}

// PUT - Update existing lab (admin only)
export async function PUT(request: NextRequest) {
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Lab ID is required" },
        { status: 400 }
      );
    }

    const lab = await updateLab(id, updates);

    if (!lab) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      lab,
    });
  } catch (error: any) {
    console.error("Update lab error:", error);
    return NextResponse.json(
      { error: "Failed to update lab" },
      { status: 500 }
    );
  }
}

// DELETE - Delete lab (admin only)
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
        { error: "Lab ID is required" },
        { status: 400 }
      );
    }

    const success = await deleteLab(id);

    if (!success) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Delete lab error:", error);
    return NextResponse.json(
      { error: "Failed to delete lab" },
      { status: 500 }
    );
  }
}
