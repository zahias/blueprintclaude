import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";
import { getCoordinatorMajorIds } from "@/lib/gradebook.server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ offeringId: string }> }
) {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offeringId } = await params;
  const { instructorIds } = await req.json() as { instructorIds?: string[] };
  if (!Array.isArray(instructorIds)) return NextResponse.json({ error: "instructorIds array is required" }, { status: 400 });

  const majorIds = await getCoordinatorMajorIds(coordinator);
  const offering = await prisma.courseOffering.findFirst({
    where: { id: offeringId, course: { majorId: { in: majorIds } } },
    include: { course: true },
  });
  if (!offering) return NextResponse.json({ error: "Course offering not found" }, { status: 404 });

  const instructors = await prisma.instructor.findMany({
    where: {
      id: { in: instructorIds },
      majors: { some: { majorId: offering.course.majorId } },
      isActive: true,
    },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.courseOfferingInstructor.deleteMany({ where: { courseOfferingId: offeringId } }),
    ...instructors.map((instructor) => prisma.courseOfferingInstructor.create({
      data: { courseOfferingId: offeringId, instructorId: instructor.id },
    })),
  ]);

  return NextResponse.json({ assigned: instructors.length });
}
