import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isMissingSchemaError, missingSchemaResponse } from "@/lib/apiErrors";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { getCoordinatorMajorIds } from "@/lib/gradebook.server";
import { parseProgressReport, splitDisplayName, termToReportCode } from "@/lib/progressReport.server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const coordinator = await getVerifiedCoordinator();
    if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mappingsRaw = formData.get("mappings");
    const termId = String(formData.get("termId") || "");
    if (!file) return NextResponse.json({ error: "No Excel file uploaded" }, { status: 400 });
    if (!termId) return NextResponse.json({ error: "termId is required" }, { status: 400 });

    let prefixMajorMap: Record<string, string>;
    try {
      prefixMajorMap = JSON.parse(String(mappingsRaw || "{}"));
    } catch {
      return NextResponse.json({ error: "Invalid prefix mapping payload" }, { status: 400 });
    }

    const [term, assignedMajorIds] = await Promise.all([
      prisma.academicTerm.findUnique({ where: { id: termId } }),
      getCoordinatorMajorIds(coordinator),
    ]);
    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    const selectedMajorIds = Object.values(prefixMajorMap).filter(Boolean);
    const unauthorized = selectedMajorIds.find((majorId) => !assignedMajorIds.includes(majorId));
    if (unauthorized) return NextResponse.json({ error: "You can only import into assigned majors." }, { status: 403 });

    const parsed = parseProgressReport(Buffer.from(await file.arrayBuffer()), termToReportCode(term.semester, term.academicYear));
    const selectedPrefixes = new Set(Object.keys(prefixMajorMap).filter((prefix) => prefixMajorMap[prefix]));
    const registrations = parsed.registrations.filter((registration) => selectedPrefixes.has(registration.prefix));
    if (registrations.length === 0) return NextResponse.json({ error: "No registrations matched the selected prefixes." }, { status: 400 });

    let createdCourses = 0;
    let reusedCourses = 0;
    let createdOfferings = 0;
    let reusedOfferings = 0;
    let createdStudents = 0;
    let updatedStudents = 0;
    let createdEnrollments = 0;
    let updatedEnrollments = 0;
    const skippedRows: string[] = [];

    await prisma.$transaction(async (tx) => {
      const courseCache = new Map<string, { id: string; code: string; majorId: string }>();
      const offeringCache = new Map<string, { id: string }>();
      const studentCache = new Map<string, { id: string }>();

      for (const registration of registrations) {
        const majorId = prefixMajorMap[registration.prefix];
        if (!majorId) {
          skippedRows.push(`${registration.studentId}: no major mapping for ${registration.prefix}`);
          continue;
        }

        const courseKey = `${majorId}:${registration.courseCode}`;
        let course = courseCache.get(courseKey);
        if (!course) {
          const existing = await tx.course.findUnique({
            where: { majorId_code: { majorId, code: registration.courseCode } },
            select: { id: true, code: true, majorId: true },
          });
          if (existing) {
            reusedCourses++;
            course = existing;
          } else {
            const created = await tx.course.create({
              data: {
                majorId,
                code: registration.courseCode,
                name: registration.courseCode,
                description: "Placeholder course created from progress report import. Upload syllabus to complete course details.",
              },
              select: { id: true, code: true, majorId: true },
            });
            createdCourses++;
            course = created;
          }
          courseCache.set(courseKey, course);
        }

        const offeringKey = `${course.id}:${term.id}`;
        let offering = offeringCache.get(offeringKey);
        if (!offering) {
          const existingOffering = await tx.courseOffering.findUnique({
            where: { courseId_termId: { courseId: course.id, termId: term.id } },
            select: { id: true },
          });
          if (existingOffering) {
            reusedOfferings++;
            offering = existingOffering;
          } else {
            const createdOffering = await tx.courseOffering.create({
              data: { courseId: course.id, termId: term.id },
              select: { id: true },
            });
            createdOfferings++;
            offering = createdOffering;
          }
          offeringCache.set(offeringKey, offering);
        }

        let student = studentCache.get(registration.studentId);
        const names = splitDisplayName(registration.studentName);
        if (!student) {
          const existingStudent = await tx.student.findUnique({
            where: { universityStudentId: registration.studentId },
            select: { id: true },
          });
          if (existingStudent) {
            updatedStudents++;
            student = await tx.student.update({
              where: { id: existingStudent.id },
              data: { ...names, displayName: registration.studentName },
              select: { id: true },
            });
          } else {
            createdStudents++;
            student = await tx.student.create({
              data: {
                universityStudentId: registration.studentId,
                email: null,
                ...names,
                displayName: registration.studentName,
              },
              select: { id: true },
            });
          }
          studentCache.set(registration.studentId, student);
        }

        const existingEnrollment = await tx.courseEnrollment.findUnique({
          where: { courseOfferingId_studentId: { courseOfferingId: offering.id, studentId: student.id } },
          select: { id: true },
        });
        if (existingEnrollment) {
          updatedEnrollments++;
          await tx.courseEnrollment.update({
            where: { id: existingEnrollment.id },
            data: { group: registration.reportMajor || null },
          });
        } else {
          createdEnrollments++;
          await tx.courseEnrollment.create({
            data: {
              courseId: course.id,
              courseOfferingId: offering.id,
              studentId: student.id,
              group: registration.reportMajor || null,
            },
          });
        }
      }
    }, { maxWait: 10000, timeout: 120000 });

    return NextResponse.json({
      importedRegistrations: registrations.length,
      createdCourses,
      reusedCourses,
      createdOfferings,
      reusedOfferings,
      createdStudents,
      updatedStudents,
      createdEnrollments,
      updatedEnrollments,
      warnings: parsed.warnings,
      skippedRows: [...parsed.skippedRows, ...skippedRows],
    });
  } catch (error) {
    console.error("Progress report import failed", error);
    if (isMissingSchemaError(error)) return missingSchemaResponse();
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not import progress report." },
      { status: 500 },
    );
  }
}
