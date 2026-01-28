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
    const subject = searchParams.get("subject")?.toUpperCase() || undefined;

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
    const { labNumber, title, fileName, isActive, deadline, subject, testCases, labType } = body;

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
      deadline,
      testCases,
      labType || 'Lab'
    );

    // For ITCS123, automatically create a Challenge with the same lab number
    if (subject === 'ITCS123' && (!labType || labType === 'Lab')) {
      try {
        await createLab(
          labNumber,
          title,
          fileName || "index.html",
          subject,
          isActive !== undefined ? isActive : true,
          deadline,
          undefined, // No test cases for challenge initially
          'Challenge'
        );
      } catch (challengeError) {
        console.error('Failed to create challenge:', challengeError);
        // Don't fail the whole request if challenge creation fails
      }
    }

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

    // Get the lab to check if it's ITCS123 and a Lab type
    const lab = await getLabById(id);
    
    if (!lab) {
      return NextResponse.json(
        { error: "Lab not found" },
        { status: 404 }
      );
    }

    const success = await deleteLab(id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete lab" },
        { status: 404 }
      );
    }

    // If it's ITCS123 and a Lab type, also delete the corresponding Challenge
    if (lab.subject === 'ITCS123' && (!lab.labType || lab.labType === 'Lab')) {
      try {
        // Find and delete the corresponding Challenge
        const allLabs = await getAllLabs(false, 'ITCS123');
        const challenge = allLabs.find(
          l => l.labNumber === lab.labNumber && l.labType === 'Challenge'
        );
        if (challenge) {
          await deleteLab(challenge.id);
        }
      } catch (challengeError) {
        console.error('Failed to delete corresponding challenge:', challengeError);
        // Don't fail the whole request if challenge deletion fails
      }
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
