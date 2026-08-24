import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedInstructor } from "@/lib/session.server";

// GET majors assigned to this instructor
export async function GET() {
  const instructor = await getVerifiedInstructor();
  if (!instructor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.instructorMajor.findMany({
    where: { instructorId: instructor.id },
    include: {
      major: {
        include: { _count: { select: { courses: true } } },
      },
    },
  });

  return NextResponse.json(assignments.map((a) => a.major));
}
