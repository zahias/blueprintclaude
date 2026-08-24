import prisma from "@/lib/prisma";

export async function resolveCourseSyllabusId(courseId: string, searchParams?: URLSearchParams) {
  const explicitId = searchParams?.get("syllabusId");
  if (explicitId) return explicitId === "legacy" ? null : explicitId;

  const semester = searchParams?.get("semester");
  const academicYear = searchParams?.get("academicYear");
  if (semester && academicYear) {
    const match = await prisma.courseSyllabus.findUnique({
      where: { courseId_semester_academicYear: { courseId, semester: semester as "FALL" | "SPRING" | "SUMMER", academicYear } },
      select: { id: true },
    });
    return match?.id ?? null;
  }

  const current = await prisma.courseSyllabus.findFirst({
    where: { courseId, isCurrent: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  return current?.id ?? null;
}

export function syllabusWhere(syllabusId: string | null) {
  return syllabusId ? { syllabusId } : { syllabusId: null };
}
