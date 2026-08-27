import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { getCoordinatorMajorIds } from "@/lib/gradebook.server";
import { getActiveTerm } from "@/lib/terms.server";
import { isMissingSchemaError, missingSchemaResponse } from "@/lib/apiErrors";

export async function GET(req: NextRequest) {
  try {
    const coordinator = await getVerifiedCoordinator();
    if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const majorIds = await getCoordinatorMajorIds(coordinator);
    const termId = req.nextUrl.searchParams.get("termId") || (await getActiveTerm())?.id;
    if (!termId || majorIds.length === 0) return NextResponse.json([]);

    const offerings = await prisma.courseOffering.findMany({
      where: { termId, course: { majorId: { in: majorIds } } },
      orderBy: [{ course: { major: { name: "asc" } } }, { course: { code: "asc" } }],
      include: {
        term: true,
        course: { include: { major: { select: { id: true, name: true } } } },
        instructors: { include: { instructor: { select: { id: true, name: true, email: true } } } },
        syllabi: { select: { id: true, sourceFileName: true, isCurrent: true } },
        courseReport: { select: { id: true, status: true, submittedAt: true, reviewedAt: true } },
        _count: { select: { enrollments: true, gradeAssessments: true, blueprints: true } },
      },
    });
    return NextResponse.json(offerings);
  } catch (error) {
    if (isMissingSchemaError(error)) return missingSchemaResponse();
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    await req.json().catch(() => null);
    return NextResponse.json(
      { error: "Course offerings are created through progress report import." },
      { status: 410 }
    );
  } catch (error) {
    if (isMissingSchemaError(error)) return missingSchemaResponse();
    throw error;
  }
}
