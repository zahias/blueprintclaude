import { NextResponse } from "next/server";
import { getInstructorFromCookies } from "@/lib/instructorAuth";
import prisma from "@/lib/prisma";
import { clearRoleCookies } from "@/lib/cookies";

export async function GET() {
  const instructor = await getInstructorFromCookies();
  if (!instructor) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const dbInstructor = await prisma.instructor.findUnique({
    where: { id: instructor.id },
    select: { id: true, email: true, name: true, isActive: true },
  });
  if (!dbInstructor || !dbInstructor.isActive) {
    const response = NextResponse.json({ error: "Stale or inactive session. Please log in again." }, { status: 401 });
    clearRoleCookies(response);
    return response;
  }
  return NextResponse.json({ instructor: dbInstructor });
}
