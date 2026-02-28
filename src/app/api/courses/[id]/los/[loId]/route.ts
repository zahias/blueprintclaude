import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; loId: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { loId } = await params;
  const { code, description } = await req.json();

  const lo = await prisma.learningOutcome.update({
    where: { id: loId },
    data: { code, description },
  });
  return NextResponse.json(lo);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; loId: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { loId } = await params;
  await prisma.learningOutcome.delete({ where: { id: loId } });
  return NextResponse.json({ success: true });
}
