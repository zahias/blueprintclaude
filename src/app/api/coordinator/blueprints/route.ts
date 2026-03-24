import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";

export async function GET() {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blueprints = await prisma.blueprint.findMany({
    where: { status: { in: ["SUBMITTED", "APPROVED", "REJECTED"] } },
    orderBy: { updatedAt: "desc" },
    include: {
      course: { include: { major: { select: { name: true } } } },
      _count: { select: { topics: true, comments: true } },
    },
  });

  return NextResponse.json(blueprints);
}
