import { NextRequest, NextResponse } from "next/server";
import { getVerifiedInstructor } from "@/lib/session.server";
import { getGradebook, getInstructorCourse } from "@/lib/gradebook.server";
import { parseCsv } from "@/lib/csv";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const course = await getInstructorCourse(courseId, instructor);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (!course.editable) return NextResponse.json({ error: "Previous-term gradebooks are read-only" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No CSV file uploaded" }, { status: 400 });

  const gradebook = await getGradebook(courseId, course.activeOfferingId);
  if (!gradebook) return NextResponse.json({ error: "Gradebook not found" }, { status: 404 });
  if (!["DRAFT", "NEEDS_REVISION"].includes(gradebook.gradebookStatus)) {
    return NextResponse.json({ error: "The gradebook is locked while submitted or approved" }, { status: 403 });
  }

  const { headers, rows } = parseCsv(await file.text());
  const studentIdIndex = headers.indexOf("Student ID");
  const emailIndex = headers.indexOf("Email address");
  if (emailIndex === -1 && studentIdIndex === -1) return NextResponse.json({ error: "CSV must include Student ID or Email address column" }, { status: 400 });

  const studentByEmail = new Map(gradebook.enrollments
    .filter((enrollment) => enrollment.student.email)
    .map((enrollment) => [enrollment.student.email!.toLowerCase(), enrollment.student]));
  const studentByUniversityId = new Map(gradebook.enrollments
    .filter((enrollment) => enrollment.student.universityStudentId)
    .map((enrollment) => [enrollment.student.universityStudentId!, enrollment.student]));
  const editableByName = new Map(gradebook.gradeAssessments.map((assessment) => [assessment.name, assessment]));

  const assessmentColumns = headers
    .map((header, index) => ({ header, index }))
    .filter((item) => item.index !== emailIndex && item.index !== studentIdIndex && item.header);
  const updates: { assessmentId: string; studentId: string; rawPoints: number | null }[] = [];
  const errors: string[] = [];
  let skipped = 0;

  assessmentColumns.forEach((column) => {
    if (!editableByName.has(column.header)) errors.push(`Unknown assessment column: ${column.header}`);
  });
  if (errors.length > 0) return NextResponse.json({ error: "Grade import validation failed", errors }, { status: 400 });

  rows.forEach((row, rowIndex) => {
    const universityStudentId = studentIdIndex >= 0 ? (row[studentIdIndex] || "").trim() : "";
    const email = emailIndex >= 0 ? (row[emailIndex] || "").toLowerCase() : "";
    const student = (universityStudentId ? studentByUniversityId.get(universityStudentId) : undefined) || (email ? studentByEmail.get(email) : undefined);
    if (!student) {
      skipped++;
      errors.push(`Row ${rowIndex + 2}: student not found (${universityStudentId || email || "blank"})`);
      return;
    }

    assessmentColumns.forEach((column) => {
      const assessment = editableByName.get(column.header);
      if (!assessment) return;
      const raw = row[column.index] ?? "";
      const rawPoints = raw === "" ? null : Number(raw);
      if (rawPoints !== null && (!Number.isFinite(rawPoints) || rawPoints < 0 || rawPoints > assessment.maxPoints)) {
        errors.push(`Row ${rowIndex + 2}: ${assessment.name} must be between 0 and ${assessment.maxPoints}`);
        return;
      }
      updates.push({ assessmentId: assessment.id, studentId: student.id, rawPoints });
    });
  });

  if (errors.some((error) => error.includes("must be between"))) {
    return NextResponse.json({ error: "Grade import validation failed", errors }, { status: 400 });
  }

  return NextResponse.json({ updates, imported: updates.length, skipped, errors });
}
