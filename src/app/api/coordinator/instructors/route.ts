import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { getCoordinatorMajorIds } from "@/lib/gradebook.server";

export async function GET() {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const majorIds = await getCoordinatorMajorIds(coordinator);
  if (majorIds.length === 0) return NextResponse.json([]);

  const instructors = await prisma.instructor.findMany({
    where: { isActive: true, majors: { some: { majorId: { in: majorIds } } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      majors: { where: { majorId: { in: majorIds } }, include: { major: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(instructors);
}
