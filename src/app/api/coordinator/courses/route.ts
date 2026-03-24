import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";

// GET courses for majors assigned to this coordinator
export async function GET(req: NextRequest) {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const majorId = req.nextUrl.searchParams.get("majorId");

  // Get coordinator's assigned major IDs
  const assignments = await prisma.coordinatorMajor.findMany({
    where: { coordinatorId: coordinator.id },
    select: { majorId: true },
  });
  const assignedMajorIds = assignments.map((a) => a.majorId);

  if (assignedMajorIds.length === 0) {
    return NextResponse.json([]);
  }

  // If majorId filter provided, verify it's in the coordinator's assigned majors
  const where: Record<string, unknown> = { majorId: { in: assignedMajorIds } };
  if (majorId) {
    if (!assignedMajorIds.includes(majorId)) {
      return NextResponse.json({ error: "Not authorized for this major" }, { status: 403 });
    }
    where.majorId = majorId;
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: { code: "asc" },
    include: {
      major: { select: { name: true } },
      _count: { select: { topics: true, los: true, blueprints: true } },
    },
  });

  return NextResponse.json(courses);
}
