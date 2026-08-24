import { NextResponse } from "next/server";
import { getVerifiedInstructor } from "@/lib/session.server";
import { getGradebook, getInstructorCourse } from "@/lib/gradebook.server";
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

  const gradebook = await getGradebook(courseId, course.activeOfferingId);
  if (!gradebook) return NextResponse.json({ error: "Gradebook not found" }, { status: 404 });
  if (!["DRAFT", "NEEDS_REVISION"].includes(gradebook.gradebookStatus)) {
    return NextResponse.json({ error: "The gradebook is locked while submitted or approved" }, { status: 403 });
  }
  const editableAssessments = gradebook.gradeAssessments;
  if (gradebook.enrollments.length === 0) return NextResponse.json({ error: "Roster has not been imported by the coordinator yet" }, { status: 400 });
  if (editableAssessments.length === 0) return NextResponse.json({ error: "No editable assessments are available for import" }, { status: 400 });

  const rows = [
    ["Student ID", "Email address", ...editableAssessments.map((assessment) => assessment.name)],
    ...gradebook.enrollments.map((enrollment) => {
      const student = enrollment.student;
      return [
        student.universityStudentId || "",
        student.email || "",
        ...editableAssessments.map((assessment) => assessment.entries.find((entry) => entry.studentId === student.id)?.rawPoints ?? ""),
      ];
    }),
  ];

  return new NextResponse(csvRows(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${gradebook.code}_grade_import_template.csv`,
    },
  });
}
