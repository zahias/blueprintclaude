import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";
import * as XLSX from "xlsx";

// POST: bulk import courses, topics, LOs from uploaded Excel file
export async function POST(req: NextRequest) {
  try {
    const coordinator = await getCoordinatorFromCookies();
    if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get coordinator's assigned major IDs
    const assignments = await prisma.coordinatorMajor.findMany({
      where: { coordinatorId: coordinator.id },
      select: { majorId: true },
    });
    const assignedMajorIds = assignments.map((a) => a.majorId);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const results = { courses: 0, los: 0, topics: 0, errors: [] as string[] };

    // ─── Sheet 1: Courses ───────────────────────────────────────
    const coursesSheet = workbook.Sheets["Courses"];
    if (coursesSheet) {
      const rows = XLSX.utils.sheet_to_json<{ MajorName: string; CourseCode: string; CourseName: string; Description?: string }>(coursesSheet);
      for (const row of rows) {
        if (!row.MajorName || !row.CourseCode || !row.CourseName) {
          results.errors.push(`Courses: missing fields in row - ${JSON.stringify(row)}`);
          continue;
        }
        const major = await prisma.major.findUnique({ where: { name: row.MajorName } });
        if (!major) { results.errors.push(`Courses: major "${row.MajorName}" not found`); continue; }
        if (!assignedMajorIds.includes(major.id)) { results.errors.push(`Courses: not authorized for major "${row.MajorName}"`); continue; }

        await prisma.course.upsert({
          where: { majorId_code: { majorId: major.id, code: row.CourseCode } },
          update: { name: row.CourseName, description: row.Description || null },
          create: { majorId: major.id, code: row.CourseCode, name: row.CourseName, description: row.Description || null },
        });
        results.courses++;
      }
    }

    // ─── Sheet 2: LearningOutcomes ──────────────────────────────
    const losSheet = workbook.Sheets["LearningOutcomes"];
    if (losSheet) {
      const rows = XLSX.utils.sheet_to_json<{ MajorName: string; CourseCode: string; LOCode: string; Description: string }>(losSheet);
      for (const row of rows) {
        if (!row.MajorName || !row.CourseCode || !row.LOCode || !row.Description) {
          results.errors.push(`LOs: missing fields in row - ${JSON.stringify(row)}`);
          continue;
        }
        const major = await prisma.major.findUnique({ where: { name: row.MajorName } });
        if (!major) { results.errors.push(`LOs: major "${row.MajorName}" not found`); continue; }
        if (!assignedMajorIds.includes(major.id)) { results.errors.push(`LOs: not authorized for major "${row.MajorName}"`); continue; }

        const course = await prisma.course.findUnique({ where: { majorId_code: { majorId: major.id, code: row.CourseCode } } });
        if (!course) { results.errors.push(`LOs: course "${row.CourseCode}" not found in "${row.MajorName}"`); continue; }

        // Check for existing LO by code within course
        const existing = await prisma.learningOutcome.findFirst({ where: { courseId: course.id, code: row.LOCode } });
        if (existing) {
          await prisma.learningOutcome.update({ where: { id: existing.id }, data: { description: row.Description } });
        } else {
          await prisma.learningOutcome.create({ data: { courseId: course.id, code: row.LOCode, description: row.Description } });
        }
        results.los++;
      }
    }

    // ─── Sheet 3: Topics ────────────────────────────────────────
    const topicsSheet = workbook.Sheets["Topics"];
    if (topicsSheet) {
      const rows = XLSX.utils.sheet_to_json<{ MajorName: string; CourseCode: string; TopicName: string; Description?: string; LinkedLOs?: string }>(topicsSheet);
      for (const row of rows) {
        if (!row.MajorName || !row.CourseCode || !row.TopicName) {
          results.errors.push(`Topics: missing fields in row - ${JSON.stringify(row)}`);
          continue;
        }
        const major = await prisma.major.findUnique({ where: { name: row.MajorName } });
        if (!major) { results.errors.push(`Topics: major "${row.MajorName}" not found`); continue; }
        if (!assignedMajorIds.includes(major.id)) { results.errors.push(`Topics: not authorized for major "${row.MajorName}"`); continue; }

        const course = await prisma.course.findUnique({ where: { majorId_code: { majorId: major.id, code: row.CourseCode } } });
        if (!course) { results.errors.push(`Topics: course "${row.CourseCode}" not found in "${row.MajorName}"`); continue; }

        // Check for existing topic by name within course
        let topic = await prisma.topic.findFirst({ where: { courseId: course.id, name: row.TopicName } });
        if (topic) {
          await prisma.topic.update({ where: { id: topic.id }, data: { description: row.Description || null } });
        } else {
          topic = await prisma.topic.create({ data: { courseId: course.id, name: row.TopicName, description: row.Description || null } });
        }

        // Link LOs if specified (comma-separated LO codes)
        if (row.LinkedLOs) {
          const loCodes = String(row.LinkedLOs).split(",").map((s) => s.trim()).filter(Boolean);
          for (const loCode of loCodes) {
            const lo = await prisma.learningOutcome.findFirst({ where: { courseId: course.id, code: loCode } });
            if (lo) {
              await prisma.topicLO.upsert({
                where: { topicId_learningOutcomeId: { topicId: topic.id, learningOutcomeId: lo.id } },
                update: {},
                create: { topicId: topic.id, learningOutcomeId: lo.id },
              });
            } else {
              results.errors.push(`Topics: LO "${loCode}" not found for topic "${row.TopicName}" in "${row.CourseCode}"`);
            }
          }
        }
        results.topics++;
      }
    }

    return NextResponse.json(results);
  } catch (e) {
    console.error("Bulk upload error:", e);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
