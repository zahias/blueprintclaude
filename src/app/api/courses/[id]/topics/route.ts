import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const topics = await prisma.topic.findMany({
    where: { courseId },
    orderBy: { sortOrder: "asc" },
    include: { los: { include: { learningOutcome: true } } },
  });
  return NextResponse.json(topics);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;
  const { name, description, sortOrder, loIds } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const topic = await prisma.topic.create({
    data: {
      courseId,
      name,
      description,
      sortOrder: sortOrder ?? 0,
      los: loIds?.length
        ? { create: loIds.map((loId: string) => ({ learningOutcomeId: loId })) }
        : undefined,
    },
    include: { los: { include: { learningOutcome: true } } },
  });
  return NextResponse.json(topic, { status: 201 });
}
