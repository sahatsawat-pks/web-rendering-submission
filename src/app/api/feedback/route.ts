import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getLabFeedback,
  getStudentLabFeedback,
  getVisibleLabFeedback,
  getSubjectFeedback,
  upsertLabFeedback,
  updateLabFeedbackVisibility,
  deleteLabFeedback,
} from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET - Retrieve feedback for a lab/student or all feedback for a subject
// Query params: labNumber, subject, studentId, visibleOnly (true for students)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const labNumber = searchParams.get("labNumber");
    const subject = searchParams.get("subject");
    const studentId = searchParams.get("studentId");
    const visibleOnly = searchParams.get("visibleOnly") === "true";

    if (!subject) {
      return NextResponse.json(
        { error: "Missing required parameter: subject" },
        { status: 400 }
      );
    }

    let feedback;

    if (!studentId) {
      // Get all feedback for the subject
      feedback = await getSubjectFeedback(subject);
    } else if (labNumber) {
      // Get feedback for a specific lab
      feedback = await getLabFeedback(labNumber, subject, studentId);
    } else if (visibleOnly) {
      // Get only visible feedback for student
      feedback = await getVisibleLabFeedback(subject, studentId);
    } else {
      // Get all feedback for student (admin view)
      feedback = await getStudentLabFeedback(subject, studentId);
    }

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error: any) {
    console.error("Get feedback error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

// POST - Create or update feedback
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { labNumber, subject, studentId, adminComment, isVisibleToStudent } = await request.json();

    if (!labNumber || !subject || !studentId) {
      return NextResponse.json(
        { error: "Missing required fields: labNumber, subject, studentId" },
        { status: 400 }
      );
    }

    const feedback = await upsertLabFeedback(
      labNumber,
      subject,
      studentId,
      adminComment || "",
      isVisibleToStudent ?? false,
      user.username
    );

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error: any) {
    console.error("Create/update feedback error:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}

// PATCH - Update feedback visibility
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { labNumber, subject, studentId, isVisibleToStudent } = await request.json();

    if (!labNumber || !subject || !studentId || isVisibleToStudent === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: labNumber, subject, studentId, isVisibleToStudent" },
        { status: 400 }
      );
    }

    const feedback = await updateLabFeedbackVisibility(
      labNumber,
      subject,
      studentId,
      isVisibleToStudent
    );

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error: any) {
    console.error("Update feedback visibility error:", error);
    return NextResponse.json(
      { error: "Failed to update feedback visibility" },
      { status: 500 }
    );
  }
}

// DELETE - Remove feedback
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const labNumber = searchParams.get("labNumber");
    const subject = searchParams.get("subject");
    const studentId = searchParams.get("studentId");

    if (!labNumber || !subject || !studentId) {
      return NextResponse.json(
        { error: "Missing required parameters: labNumber, subject, studentId" },
        { status: 400 }
      );
    }

    const success = await deleteLabFeedback(labNumber, subject, studentId);

    if (!success) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete feedback error:", error);
    return NextResponse.json(
      { error: "Failed to delete feedback" },
      { status: 500 }
    );
  }
}
