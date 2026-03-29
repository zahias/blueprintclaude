import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";

export async function GET() {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Scope to coordinator's assigned majors
  const assignments = await prisma.coordinatorMajor.findMany({
    where: { coordinatorId: coordinator.id },
    select: { majorId: true },
  });
  const majorIds = assignments.map((a) => a.majorId);

  const blueprints = await prisma.blueprint.findMany({
    where: {
      status: { in: ["SUBMITTED", "APPROVED", "NEEDS_REVISION"] },
      course: { majorId: { in: majorIds } },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      course: { include: { major: { select: { name: true } } } },
      _count: { select: { topics: true, comments: true } },
    },
  });

  return NextResponse.json(blueprints);
}
