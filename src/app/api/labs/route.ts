import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getCanonicalSubjectCodeOrDefault } from '@/lib/subjectConfig';

// Performance optimization: Cache lab listings
export const dynamic = 'force-dynamic';
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
      const subject = getCanonicalSubjectCodeOrDefault(searchParams.get("subject")) || undefined;

      const labs = await getAllLabs(activeOnly, subject);

      return NextResponse.json({
        success: true,
        labs,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
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
    const { labNumber, title, fileName, isActive, deadline, subject: rawSubject, testCases, labType, subQuestions, challengeEnabled } = body;
    const subject = getCanonicalSubjectCodeOrDefault(rawSubject) || undefined;

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
      labType || 'Lab',
      subQuestions,
      challengeEnabled
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

    // Sync Challenge entry if this is a Lab type and isActive or challengeEnabled was updated
    if ((!lab.labType || lab.labType === 'Lab') && (updates.isActive !== undefined || updates.challengeEnabled !== undefined)) {
      try {
        // Find corresponding Challenge entry
        const allLabs = await getAllLabs(false, lab.subject);
        const challenge = allLabs.find(
          l => l.labNumber === lab.labNumber && l.labType === 'Challenge'
        );
        
        if (challenge) {
          // Challenge should be active only if Lab is active AND challengeEnabled is true
          const challengeShouldBeActive = lab.isActive && (lab.challengeEnabled !== false);
          if (challenge.isActive !== challengeShouldBeActive) {
            await updateLab(challenge.id, { isActive: challengeShouldBeActive });
          }
        }
      } catch (syncError) {
        console.error('Failed to sync challenge entry:', syncError);
        // Don't fail the whole request if sync fails
      }
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

    // Get the lab to check if it's a Lab type
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

    // If it's a Lab type, also delete the corresponding Challenge entry if exists
    if (!lab.labType || lab.labType === 'Lab') {
      try {
        // Find and delete the corresponding Challenge
        const allLabs = await getAllLabs(false, lab.subject);
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
