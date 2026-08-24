import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedInstructor } from "@/lib/session.server";
import { getInstructorCourse, parseParticipantCsv } from "@/lib/gradebook.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const startedAt = Date.now();
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const course = await getInstructorCourse(courseId, instructor);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (!course.editable || !course.activeOfferingId) {
    return NextResponse.json({ error: "Only active-term assigned courses can be edited" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No CSV file uploaded" }, { status: 400 });

  const rows = parseParticipantCsv(await file.text());
  if (rows.length === 0) return NextResponse.json({ error: "No students found in CSV" }, { status: 400 });

  let created = 0;
  let updated = 0;
  let enrolled = 0;
  const existingStudents = await prisma.student.findMany({
    where: { email: { in: rows.map((row) => row.email) } },
    select: { email: true },
  });
  const existingEmails = new Set(existingStudents.map((student) => student.email).filter(Boolean));

  for (const row of rows) {
    const student = await prisma.student.upsert({
      where: { email: row.email },
      update: { firstName: row.firstName, lastName: row.lastName, displayName: `${row.firstName} ${row.lastName}` },
      create: { email: row.email, firstName: row.firstName, lastName: row.lastName, displayName: `${row.firstName} ${row.lastName}` },
    });
    existingEmails.has(row.email) ? updated++ : created++;

    const enrollment = await prisma.courseEnrollment.upsert({
      where: { courseOfferingId_studentId: { courseOfferingId: course.activeOfferingId, studentId: student.id } },
      update: { group: row.group },
      create: { courseId, courseOfferingId: course.activeOfferingId, studentId: student.id, group: row.group },
    });
    if (enrollment.createdAt.getTime() === enrollment.updatedAt.getTime()) enrolled++;
  }

  console.info(`[api/students/upload] ${rows.length} rows ${Date.now() - startedAt}ms`);
  return NextResponse.json({ imported: rows.length, created, updated, enrolled });
}
