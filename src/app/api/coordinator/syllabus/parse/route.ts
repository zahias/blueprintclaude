import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { parseSyllabusDocx } from "@/lib/syllabusParser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const coordinator = await getVerifiedCoordinator();
    if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const assignments = await prisma.coordinatorMajor.findMany({
      where: { coordinatorId: coordinator.id },
      select: { majorId: true },
    });
    const assignedMajorIds = assignments.map((assignment) => assignment.majorId);
    if (assignedMajorIds.length === 0) {
      return NextResponse.json({ error: "No assigned majors found." }, { status: 403 });
    }

    const formData = await req.formData();
    const termId = String(formData.get("termId") || "");
    if (!termId) return NextResponse.json({ error: "Select a created term before parsing syllabi." }, { status: 400 });
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    const file = formData.get("file");
    if (file instanceof File && !files.includes(file)) files.push(file);
    if (files.length === 0) return NextResponse.json({ error: "No syllabus files uploaded." }, { status: 400 });

    const [offerings, majors, syllabi] = await Promise.all([
      prisma.courseOffering.findMany({
        where: { termId, course: { majorId: { in: assignedMajorIds } } },
        select: {
          course: {
            select: { id: true, majorId: true, code: true, name: true, major: { select: { name: true } } },
          },
        },
        orderBy: [{ course: { code: "asc" } }, { course: { name: "asc" } }],
      }),
      prisma.major.findMany({
        where: { id: { in: assignedMajorIds } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.courseSyllabus.findMany({
        where: { courseOffering: { termId, course: { majorId: { in: assignedMajorIds } } } },
        select: { id: true, courseId: true, semester: true, academicYear: true, isCurrent: true },
      }),
    ]);
    const courses = offerings.map((offering) => offering.course);

    const parsed = [];
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".docx")) {
        parsed.push({
          fileName: file.name,
          courseCode: "",
          courseName: "",
          learningOutcomes: [],
          topics: [],
          warnings: ["Only .docx files are supported in this version."],
          matchedCourseId: null,
          matchedMajorId: null,
          matchStatus: "unsupported",
        });
        continue;
      }

      const syllabus = await parseSyllabusDocx(Buffer.from(await file.arrayBuffer()), file.name);
      const matches = courses.filter((course) => course.code.toUpperCase() === syllabus.courseCode.toUpperCase());
      const warnings = [...syllabus.warnings];
      if (matches.length === 0) {
        warnings.push("This course is not in the active term offerings. Import the progress report first or check the course code.");
      }
      parsed.push({
        ...syllabus,
        warnings,
        matchedCourseId: matches.length === 1 ? matches[0].id : null,
        matchedMajorId: matches.length === 1 ? matches[0].majorId : null,
        matchStatus: matches.length === 1 ? "matched" : matches.length > 1 ? "ambiguous" : "unmatched",
      });
    }

    return NextResponse.json({ syllabi: parsed, courses, majors, courseSyllabi: syllabi });
  } catch (error) {
    console.error("Syllabus parse error:", error);
    return NextResponse.json({ error: "Failed to parse syllabus file." }, { status: 500 });
  }
}
