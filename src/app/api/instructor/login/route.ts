import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, signInstructorToken } from "@/lib/instructorAuth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const instructor = await prisma.instructor.findUnique({ where: { email } });
  if (!instructor) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!instructor.isActive) {
    return NextResponse.json({ error: "Account is deactivated. Contact your administrator." }, { status: 403 });
  }

  const valid = await verifyPassword(password, instructor.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signInstructorToken({
    id: instructor.id,
    email: instructor.email,
    name: instructor.name,
  });

  const cookieStore = await cookies();
  cookieStore.set("instructor_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return NextResponse.json({
    instructor: { id: instructor.id, email: instructor.email, name: instructor.name },
  });
}
