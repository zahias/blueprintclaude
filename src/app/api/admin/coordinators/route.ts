import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const coordinators = await prisma.coordinator.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      createdAt: true,
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(coordinators);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, password, name } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
  }

  const existing = await prisma.coordinator.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A coordinator with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const coordinator = await prisma.coordinator.create({
    data: { email, passwordHash, name },
  });

  return NextResponse.json(
    { id: coordinator.id, email: coordinator.email, name: coordinator.name },
    { status: 201 }
  );
}
