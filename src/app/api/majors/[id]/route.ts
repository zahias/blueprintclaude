import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const major = await prisma.major.findUnique({
    where: { id },
    include: { courses: { orderBy: { code: "asc" } } },
  });
  if (!major) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(major);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, description } = await req.json();
  const major = await prisma.major.update({
    where: { id },
    data: { name, description },
  });
  return NextResponse.json(major);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.major.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
