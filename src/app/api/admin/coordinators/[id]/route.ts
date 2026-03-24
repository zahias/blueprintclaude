import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.name) data.name = body.name;
  if (body.email) data.email = body.email;
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 12);

  const coordinator = await prisma.coordinator.update({
    where: { id },
    data,
  });

  return NextResponse.json({ id: coordinator.id, email: coordinator.email, name: coordinator.name, isActive: coordinator.isActive });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.coordinator.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
