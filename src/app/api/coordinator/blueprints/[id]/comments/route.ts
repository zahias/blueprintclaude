import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const blueprint = await prisma.blueprint.findUnique({ where: { id } });
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
