import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";

// GET majors assigned to this coordinator
export async function GET() {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.coordinatorMajor.findMany({
    where: { coordinatorId: coordinator.id },
    include: {
      major: {
        include: { _count: { select: { courses: true } } },
      },
    },
  });

  return NextResponse.json(assignments.map((a) => a.major));
}
