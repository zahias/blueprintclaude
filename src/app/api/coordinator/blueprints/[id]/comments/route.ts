import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { getCoordinatorMajorIds } from "@/lib/gradebook.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const majorIds = await getCoordinatorMajorIds(coordinator);
  const blueprint = await prisma.blueprint.findFirst({ where: { id, course: { majorId: { in: majorIds } } } });
  if (!blueprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.reviewComment.create({
    data: {
      blueprintId: blueprint.id,
      coordinatorId: coordinator.id,
      content,
    },
    include: { coordinator: { select: { name: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
