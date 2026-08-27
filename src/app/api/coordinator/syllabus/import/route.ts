import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import type { ParsedSyllabusLO, ParsedSyllabusTopic } from "@/lib/syllabusParser";
import { isMissingSchemaError, missingSchemaResponse } from "@/lib/apiErrors";

export const runtime = "nodejs";

interface ImportSyllabusPayload {
  courseId?: string | null;
  majorId?: string | null;
  courseCode: string;
  courseName: string;
  semester: "FALL" | "SPRING" | "SUMMER";
  academicYear: string;
  fileName?: string | null;
  learningOutcomes: ParsedSyllabusLO[];
  topics: ParsedSyllabusTopic[];
}

function cleanCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function cleanText(value: string | null | undefined) {
  return value?.trim() || "";
}

export async function POST(req: NextRequest) {
  try {
    const coordinator = await getVerifiedCoordinator();
    if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { syllabi?: ImportSyllabusPayload[]; termId?: string };
    const syllabi = body.syllabi || [];
    if (syllabi.length === 0) return NextResponse.json({ error: "No reviewed syllabi provided." }, { status: 400 });
    if (!body.termId) return NextResponse.json({ error: "Select a created term before importing syllabi." }, { status: 400 });

    const selectedTerm = await prisma.academicTerm.findUnique({ where: { id: body.termId } });
    if (!selectedTerm) return NextResponse.json({ error: "Selected term was not found." }, { status: 400 });

    const assignments = await prisma.coordinatorMajor.findMany({
      where: { coordinatorId: coordinator.id },
      select: { majorId: true },
    });
    const assignedMajorIds = assignments.map((assignment) => assignment.majorId);

    const results = {
      courses: { created: 0, updated: 0 },
      syllabi: { created: 0, replaced: 0 },
      learningOutcomes: { created: 0, updated: 0 },
      topics: { created: 0, updated: 0 },
      links: { replaced: 0 },
      errors: [] as string[],
      items: [] as {
        fileName: string | null;
        courseCode: string;
        courseId: string | null;
        syllabusId: string | null;
        status: "created" | "replaced" | "skipped";
        learningOutcomes: number;
        topics: number;
        links: number;
        errors: string[];
      }[],
    };

    for (const syllabus of syllabi) {
      const item = {
        fileName: syllabus.fileName || null,
        courseCode: cleanCode(syllabus.courseCode || ""),
        courseId: null as string | null,
        syllabusId: null as string | null,
        status: "skipped" as "created" | "replaced" | "skipped",
        learningOutcomes: 0,
        topics: 0,
        links: 0,
        errors: [] as string[],
      };
      results.items.push(item);

      const courseCode = cleanCode(syllabus.courseCode);
      const courseName = cleanText(syllabus.courseName);
      const academicYear = selectedTerm.academicYear;
      const semester = selectedTerm.semester;
      if (!courseCode || !courseName) {
        const message = "A syllabus is missing course code or course name.";
        item.errors.push(message);
        results.errors.push(message);
        continue;
      }

      if (!syllabus.courseId) {
        const message = `${courseCode}: select an active offering before importing.`;
        item.errors.push(message);
        results.errors.push(message);
        continue;
      }
      const selectedCourseId = syllabus.courseId;

      await prisma.$transaction(async (tx) => {
        const offering = await tx.courseOffering.findFirst({
          where: {
            termId: selectedTerm.id,
            courseId: selectedCourseId,
            course: { majorId: { in: assignedMajorIds } },
          },
          include: { course: true },
        });
        if (!offering) {
          const message = `${courseCode}: this course is not in the selected term offerings. Import the progress report first or check the course code.`;
          item.errors.push(message);
          results.errors.push(message);
          return;
        }

        const course = await tx.course.update({
          where: { id: offering.courseId },
          data: { name: courseName },
        });
        results.courses.updated++;
        item.courseId = course.id;

        const existingSyllabus = await tx.courseSyllabus.findUnique({
          where: { courseId_semester_academicYear: { courseId: course.id, semester, academicYear } },
        });
        if (existingSyllabus) {
          const dependentBlueprintTopics = await tx.blueprintTopic.count({
            where: {
              topic: { syllabusId: existingSyllabus.id },
              blueprint: { courseOfferingId: offering.id },
            },
          });
          if (dependentBlueprintTopics > 0) {
            const message = `${courseCode}: existing syllabus version is used by ${dependentBlueprintTopics} blueprint topic row(s). Create a new term/version instead of replacing it.`;
            item.errors.push(message);
            results.errors.push(message);
            return;
          }
        }

        await tx.courseSyllabus.updateMany({
          where: { courseId: course.id, isCurrent: true },
          data: { isCurrent: false },
        });

        const courseSyllabus = existingSyllabus
          ? await tx.courseSyllabus.update({
              where: { id: existingSyllabus.id },
              data: {
                sourceFileName: syllabus.fileName || null,
                importedById: coordinator.id,
                courseOfferingId: offering.id,
                isCurrent: true,
              },
            })
          : await tx.courseSyllabus.create({
              data: {
                courseId: course.id,
                courseOfferingId: offering.id,
                semester,
                academicYear,
                sourceFileName: syllabus.fileName || null,
                importedById: coordinator.id,
                isCurrent: true,
              },
            });
        if (existingSyllabus) results.syllabi.replaced++;
        else results.syllabi.created++;
        item.syllabusId = courseSyllabus.id;
        item.status = existingSyllabus ? "replaced" : "created";

        if (existingSyllabus) {
          await tx.topic.deleteMany({ where: { syllabusId: courseSyllabus.id } });
          await tx.learningOutcome.deleteMany({ where: { syllabusId: courseSyllabus.id } });
        }

        const loIdByCode = new Map<string, string>();
        for (const lo of syllabus.learningOutcomes) {
          const code = cleanCode(lo.code);
          const description = cleanText(lo.description);
          if (!code || !description) continue;

          const saved = await tx.learningOutcome.create({
            data: { courseId: course.id, syllabusId: courseSyllabus.id, code, description },
          });
          loIdByCode.set(code, saved.id);
          results.learningOutcomes.created++;
          item.learningOutcomes++;
        }

        for (const topicDraft of syllabus.topics) {
          const name = cleanText(topicDraft.name);
          if (!name) continue;

          const topic = await tx.topic.create({
            data: {
              courseId: course.id,
              syllabusId: courseSyllabus.id,
              name,
              description: null,
              sortOrder: Number.isFinite(topicDraft.sortOrder) ? topicDraft.sortOrder : 0,
            },
          });
          results.topics.created++;
          item.topics++;

          const uniqueCodes = [...new Set((topicDraft.loCodes || []).map(cleanCode).filter(Boolean))];
          for (const code of uniqueCodes) {
            const loId = loIdByCode.get(code);
            if (!loId) {
              const message = `${courseCode} / ${name}: ${code} was not found in the reviewed CLO list.`;
              item.errors.push(message);
              results.errors.push(message);
              continue;
            }
            await tx.topicLO.create({ data: { topicId: topic.id, learningOutcomeId: loId } });
            results.links.replaced++;
            item.links++;
          }
        }
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    if (isMissingSchemaError(error)) return missingSchemaResponse();
    console.error("Syllabus import error:", error);
    return NextResponse.json({ error: "Failed to import reviewed syllabus." }, { status: 500 });
  }
}
