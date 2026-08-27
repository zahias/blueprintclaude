import { NextResponse } from "next/server";
import { getVerifiedInstructor } from "@/lib/session.server";
import { getInstructorCourse } from "@/lib/gradebook.server";
import { csvRows } from "@/lib/csv";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const course = await getInstructorCourse(courseId, instructor);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (!course.editable) return NextResponse.json({ error: "Previous-term gradebooks are read-only" }, { status: 403 });

  const csv = csvRows([
    ["First name", "Last name", "Email address", "Groups"],
    ["Maya", "Haddad", "maya.haddad@example.edu", "Section 1"],
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${course.code}_roster_template.csv`,
    },
  });
}
