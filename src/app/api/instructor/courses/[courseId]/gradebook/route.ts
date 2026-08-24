import { NextRequest, NextResponse } from "next/server";
import { getGradebook, getInstructorCourse } from "@/lib/gradebook.server";
import { getVerifiedInstructor } from "@/lib/session.server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const course = await getInstructorCourse(courseId, instructor);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const gradebook = await getGradebook(courseId, course.activeOfferingId);
  return NextResponse.json({
    ...gradebook,
    editable: course.editable,
    activeOfferingId: course.activeOfferingId,
    activeTerm: course.activeTerm,
  });
}
