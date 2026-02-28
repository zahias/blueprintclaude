import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/instructorAuth";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Email, password, and name are required" },
      { status: 400 }
    );
  }

  // Check if email already exists
  const existing = await prisma.instructor.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const instructor = await prisma.instructor.create({
    data: { email, passwordHash, name },
  });

  return NextResponse.json(
    { id: instructor.id, email: instructor.email, name: instructor.name },
    { status: 201 }
  );
}
