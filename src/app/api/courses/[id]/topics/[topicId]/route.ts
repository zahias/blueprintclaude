import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; topicId: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topicId } = await params;
  const { name, description, sortOrder, loIds } = await req.json();

  // Update topic and replace LO links
  const topic = await prisma.$transaction(async (tx) => {
    await tx.topicLO.deleteMany({ where: { topicId } });
    return tx.topic.update({
      where: { id: topicId },
      data: {
        name,
        description,
        sortOrder,
        los: loIds?.length
          ? { create: loIds.map((loId: string) => ({ learningOutcomeId: loId })) }
          : undefined,
      },
      include: { los: { include: { learningOutcome: true } } },
    });
  });

  return NextResponse.json(topic);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; topicId: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topicId } = await params;
  await prisma.topic.delete({ where: { id: topicId } });
  return NextResponse.json({ success: true });
}
