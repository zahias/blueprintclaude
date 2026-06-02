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

  console.log("[coord/blueprints] coordinator:", coordinator.id, coordinator.name);
  console.log("[coord/blueprints] majorIds:", majorIds);

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

  console.log("[coord/blueprints] found:", blueprints.length);

  // Debug: if empty, check what exists for these majors
  if (blueprints.length === 0 && majorIds.length > 0) {
    const allForMajors = await prisma.blueprint.findMany({
      where: { course: { majorId: { in: majorIds } } },
      select: { id: true, status: true, title: true, course: { select: { code: true, majorId: true } } },
    });
    console.log("[coord/blueprints] ALL blueprints for these majors (any status):", JSON.stringify(allForMajors));
  }

  return NextResponse.json(blueprints);
}
