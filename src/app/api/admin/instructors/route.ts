import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { hashPassword } from "@/lib/instructorAuth";

export async function GET() {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const instructors = await prisma.instructor.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { blueprints: true } },
      majors: { select: { major: { select: { id: true, name: true } } } },
    },
  });

  // Flatten majors for easier frontend consumption
  const result = instructors.map((i) => ({
    ...i,
    assignedMajors: i.majors.map((im) => im.major),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, password, name } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
  }

  const existing = await prisma.instructor.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An instructor with this email already exists" }, { status: 409 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const instructor = await prisma.instructor.create({
      data: { email, passwordHash, name },
    });

    return NextResponse.json(
      { id: instructor.id, email: instructor.email, name: instructor.name },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/admin/instructors error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
