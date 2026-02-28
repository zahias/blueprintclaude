import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const los = await prisma.learningOutcome.findMany({
    where: { courseId },
    orderBy: { code: "asc" },
    include: { topics: { include: { topic: true } } },
  });
  return NextResponse.json(los);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;
  const { code, description } = await req.json();
  if (!code || !description) {
    return NextResponse.json({ error: "Code and description are required" }, { status: 400 });
  }

  const lo = await prisma.learningOutcome.create({
    data: { courseId, code, description },
  });
  return NextResponse.json(lo, { status: 201 });
}
