import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, signCoordinatorToken } from "@/lib/coordinatorAuth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const coordinator = await prisma.coordinator.findUnique({ where: { email } });
  if (!coordinator) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!coordinator.isActive) {
    return NextResponse.json({ error: "Account is deactivated. Contact your administrator." }, { status: 403 });
  }

  const valid = await verifyPassword(password, coordinator.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signCoordinatorToken({
    id: coordinator.id,
    email: coordinator.email,
    name: coordinator.name,
  });

  const cookieStore = await cookies();
  cookieStore.set("coordinator_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return NextResponse.json({
    coordinator: { id: coordinator.id, email: coordinator.email, name: coordinator.name },
  });
}
