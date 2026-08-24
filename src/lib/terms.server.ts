import prisma from "@/lib/prisma";
import type { InstructorPayload } from "@/lib/instructorAuth";

export async function getActiveTerm() {
  return prisma.academicTerm.findFirst({
    where: { isActive: true },
    orderBy: { activatedAt: "desc" },
  });
}

export async function activateTerm(termId: string, coordinatorId: string | null) {
  return prisma.$transaction(async (tx) => {
    const coordinator = coordinatorId ? await tx.coordinator.findUnique({ where: { id: coordinatorId }, select: { id: true } }) : null;
    await tx.academicTerm.updateMany({ where: { isActive: true }, data: { isActive: false } });
    return tx.academicTerm.update({
      where: { id: termId },
      data: { isActive: true, activatedAt: new Date(), activatedById: coordinator?.id || null },
    });
  });
}

export async function ensureCourseOffering(courseId: string, termId: string) {
  return prisma.courseOffering.upsert({
    where: { courseId_termId: { courseId, termId } },
    update: {},
    create: { courseId, termId },
  });
}

export async function getInstructorActiveOffering(courseId: string, instructor: InstructorPayload) {
  const activeTerm = await getActiveTerm();
  if (!activeTerm) return null;

  return prisma.courseOffering.findFirst({
    where: {
      courseId,
      termId: activeTerm.id,
      instructors: { some: { instructorId: instructor.id } },
    },
    include: {
      term: true,
      course: { include: { major: { select: { id: true, name: true } } } },
      syllabi: { where: { isCurrent: true }, select: { id: true } },
    },
  });
}

export async function canInstructorEditCourse(courseId: string, instructor: InstructorPayload) {
  const offering = await getInstructorActiveOffering(courseId, instructor);
  return { editable: Boolean(offering), offering };
}
