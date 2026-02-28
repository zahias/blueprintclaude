import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getInstructorFromCookies } from "@/lib/instructorAuth";

// GET: list blueprints for the logged-in instructor
export async function GET(req: NextRequest) {
  const instructor = await getInstructorFromCookies();
  if (!instructor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const semester = req.nextUrl.searchParams.get("semester");
  const academicYear = req.nextUrl.searchParams.get("academicYear");

  const where: Record<string, unknown> = { instructorId: instructor.id };
  if (status) where.status = status;
  if (semester) where.semester = semester;
  if (academicYear) where.academicYear = academicYear;

  const blueprints = await prisma.blueprint.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      course: { include: { major: { select: { name: true } } } },
      _count: { select: { topics: true, comments: true } },
    },
  });

  return NextResponse.json(blueprints);
}
