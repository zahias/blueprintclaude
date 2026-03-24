import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { hashPassword } from "@/lib/coordinatorAuth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.name) data.name = body.name;
    if (body.email) data.email = body.email;
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const coordinator = await prisma.coordinator.update({
      where: { id },
      data,
    });

    return NextResponse.json({ id: coordinator.id, email: coordinator.email, name: coordinator.name, isActive: coordinator.isActive });
  } catch (e) {
    console.error("PUT /api/admin/coordinators/[id] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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
