import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedAdmin } from "@/lib/session.server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getVerifiedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { isActive } = await req.json();

  const instructor = await prisma.instructor.update({
    where: { id },
    data: { isActive },
  });

  return NextResponse.json(instructor);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getVerifiedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.instructor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
