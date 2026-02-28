import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Find blueprint by id or accessToken
  let blueprint = await prisma.blueprint.findUnique({ where: { id: token } });
  if (!blueprint) {
    blueprint = await prisma.blueprint.findUnique({ where: { accessToken: token } });
  }
  if (!blueprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comments = await prisma.reviewComment.findMany({
    where: { blueprintId: blueprint.id },
    include: { admin: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  // Find blueprint by id or accessToken
  let blueprint = await prisma.blueprint.findUnique({ where: { id: token } });
  if (!blueprint) {
    blueprint = await prisma.blueprint.findUnique({ where: { accessToken: token } });
  }
  if (!blueprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.reviewComment.create({
    data: {
      blueprintId: blueprint.id,
      adminId: admin.id,
      content,
    },
    include: { admin: { select: { name: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
