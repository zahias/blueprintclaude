import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      major: { coordinators: { some: { coordinatorId: coordinator.id } } },
    },
    select: { id: true },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const syllabi = await prisma.courseSyllabus.findMany({
    where: { courseId },
    orderBy: [{ isCurrent: "desc" }, { academicYear: "desc" }, { semester: "asc" }],
    include: {
      _count: { select: { los: true, topics: true } },
      importedBy: { select: { name: true } },
    },
  });

  return NextResponse.json(syllabi);
}
