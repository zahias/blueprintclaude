import prisma from "@/lib/prisma";
import type { CoordinatorPayload } from "@/lib/coordinatorAuth";
import type { InstructorPayload } from "@/lib/instructorAuth";
import { getInstructorActiveOffering } from "@/lib/terms.server";

export const GRADEBOOK_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "NEEDS_REVISION"] as const;
export type GradebookStatusValue = typeof GRADEBOOK_STATUSES[number];

export async function getInstructorCourse(courseId: string, instructor: InstructorPayload) {
  const offering = await getInstructorActiveOffering(courseId, instructor);
  if (offering) {
    return {
      ...offering.course,
      activeOfferingId: offering.id,
      activeTerm: offering.term,
      editable: offering.term.isActive,
    };
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      major: {
        instructors: {
          some: { instructorId: instructor.id },
        },
      },
    },
    include: { major: { select: { id: true, name: true } } },
  });
  if (!course) return null;
  return { ...course, activeOfferingId: null, activeTerm: null, editable: false };
}

export async function getCoordinatorMajorIds(coordinator: CoordinatorPayload): Promise<string[]> {
  const assignments = await prisma.coordinatorMajor.findMany({
    where: { coordinatorId: coordinator.id },
    select: { majorId: true },
  });
  return assignments.map((assignment) => assignment.majorId);
}

export function deriveGradebookStatus(statuses: string[]): GradebookStatusValue {
  if (statuses.length === 0) return "DRAFT";
  if (statuses.every((status) => status === "APPROVED")) return "APPROVED";
  if (statuses.every((status) => status === "SUBMITTED")) return "SUBMITTED";
  if (statuses.every((status) => status === "NEEDS_REVISION")) return "NEEDS_REVISION";
  if (statuses.includes("SUBMITTED")) return "SUBMITTED";
  if (statuses.includes("NEEDS_REVISION")) return "NEEDS_REVISION";
  return "DRAFT";
}

export async function ensureGradebook(courseOfferingId: string) {
  const existing = await prisma.gradebook.findUnique({
    where: { courseOfferingId },
    include: {
      comments: {
        orderBy: { createdAt: "desc" },
        include: { coordinator: { select: { name: true } } },
      },
    },
  });
  if (existing) return existing;

  const assessments = await prisma.gradeAssessment.findMany({
    where: { courseOfferingId },
    select: {
      status: true,
      submittedAt: true,
      reviewedAt: true,
      reviewedById: true,
    },
  });
  const status = deriveGradebookStatus(assessments.map((assessment) => assessment.status));
  const submittedAt = assessments
    .map((assessment) => assessment.submittedAt)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
  const reviewedAt = assessments
    .map((assessment) => assessment.reviewedAt)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
  const reviewedById = assessments.find((assessment) => assessment.reviewedById)?.reviewedById || null;

  return prisma.gradebook.create({
    data: {
      courseOfferingId,
      status,
      submittedAt,
      reviewedAt,
      reviewedById,
    },
    include: {
      comments: {
        orderBy: { createdAt: "desc" },
        include: { coordinator: { select: { name: true } } },
      },
    },
  });
}

export async function getGradebook(courseId: string, courseOfferingId?: string | null) {
  const enrollmentWhere = courseOfferingId ? { courseOfferingId } : { courseId };
  const assessmentWhere = courseOfferingId ? { courseOfferingId } : { courseId };
  const blueprintWhere = courseOfferingId ? { courseOfferingId } : { courseId };

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      major: { select: { name: true } },
      blueprints: {
        where: blueprintWhere,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, totalMarks: true, status: true },
      },
      enrollments: {
        where: enrollmentWhere,
        orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
        include: { student: true },
      },
      gradeAssessments: {
        where: assessmentWhere,
        orderBy: { createdAt: "asc" },
        include: {
          blueprint: { select: { id: true, title: true, totalMarks: true } },
          entries: true,
        },
      },
    },
  });
  if (!course) return null;

  const gradebook = courseOfferingId ? await ensureGradebook(courseOfferingId) : null;
  return {
    ...course,
    gradebook,
    gradebookStatus: gradebook?.status || deriveGradebookStatus(course.gradeAssessments.map((assessment) => assessment.status)),
    gradebookComments: gradebook?.comments || [],
  };
}

export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      i++;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseParticipantCsv(text: string) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^"|"$/g, ""));
  const firstNameIndex = headers.indexOf("First name");
  const lastNameIndex = headers.indexOf("Last name");
  const emailIndex = headers.indexOf("Email address");
  const groupIndex = headers.indexOf("Groups");

  if (firstNameIndex === -1 || lastNameIndex === -1 || emailIndex === -1) {
    throw new Error("CSV must include First name, Last name, and Email address columns");
  }

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return {
      firstName: cells[firstNameIndex]?.replace(/^"|"$/g, "").trim() || "",
      lastName: cells[lastNameIndex]?.replace(/^"|"$/g, "").trim() || "",
      email: cells[emailIndex]?.replace(/^"|"$/g, "").trim().toLowerCase() || "",
      group: groupIndex >= 0 ? cells[groupIndex]?.replace(/^"|"$/g, "").trim() || null : null,
    };
  }).filter((row) => row.firstName && row.lastName && row.email);
}
