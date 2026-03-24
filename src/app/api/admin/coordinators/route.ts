import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { hashPassword } from "@/lib/coordinatorAuth";

export async function GET() {
  try {
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
  } catch (e) {
    console.error("GET /api/admin/coordinators error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const passwordHash = await hashPassword(password);
    const coordinator = await prisma.coordinator.create({
      data: { email, passwordHash, name },
    });

    return NextResponse.json(
      { id: coordinator.id, email: coordinator.email, name: coordinator.name },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/admin/coordinators error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
