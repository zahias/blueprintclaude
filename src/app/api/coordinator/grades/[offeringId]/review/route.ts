import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { ensureGradebook, getCoordinatorMajorIds } from "@/lib/gradebook.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ offeringId: string }> }
) {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offeringId } = await params;
  const { status, comment } = await req.json() as { status?: string; comment?: string };
  if (!["APPROVED", "NEEDS_REVISION"].includes(status || "")) {
    return NextResponse.json({ error: "Status must be APPROVED or NEEDS_REVISION" }, { status: 400 });
  }
  if (status === "NEEDS_REVISION" && !comment?.trim()) {
    return NextResponse.json({ error: "A comment is required when requesting revision" }, { status: 400 });
  }

  const majorIds = await getCoordinatorMajorIds(coordinator);
  const offering = await prisma.courseOffering.findFirst({
    where: {
      id: offeringId,
      course: { majorId: { in: majorIds } },
    },
    include: { gradeAssessments: { select: { id: true } }, gradebook: true },
  });
  if (!offering || offering.gradeAssessments.length === 0) {
    return NextResponse.json({ error: "Submitted gradebook not found" }, { status: 404 });
  }
  const gradebook = offering.gradebook || await ensureGradebook(offering.id);
  if (gradebook.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Only submitted gradebooks can be reviewed" }, { status: 400 });
  }

  const assessmentIds = offering.gradeAssessments.map((assessment) => assessment.id);
  await prisma.$transaction(async (tx) => {
    if (comment?.trim()) {
      await tx.gradebookComment.create({
        data: {
          gradebookId: gradebook.id,
          coordinatorId: coordinator.id,
          content: comment.trim(),
        },
      });
    }
    await tx.gradebook.update({
      where: { id: gradebook.id },
      data: {
        status: status as "APPROVED" | "NEEDS_REVISION",
        reviewedAt: new Date(),
        reviewedById: coordinator.id,
      },
    });
    await tx.gradeAssessment.updateMany({
      where: { id: { in: assessmentIds } },
      data: {
        status: status as "APPROVED" | "NEEDS_REVISION",
        reviewedAt: new Date(),
        reviewedById: coordinator.id,
      },
    });
  });

  return NextResponse.json({ status, updated: assessmentIds.length });
}
