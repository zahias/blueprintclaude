import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { coordinatorCanAccessCourseReport } from "@/lib/courseReports.server";
import { getVerifiedCoordinator } from "@/lib/session.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reportId } = await params;
  const report = await coordinatorCanAccessCourseReport(reportId, coordinator);
  if (!report) return NextResponse.json({ error: "Course report not found" }, { status: 404 });

  const body = await req.json();
  const action = body.action;
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (action !== "APPROVE" && action !== "REQUEST_REVISION") {
    return NextResponse.json({ error: "Action must be APPROVE or REQUEST_REVISION" }, { status: 400 });
  }
  if (action === "REQUEST_REVISION" && !comment) {
    return NextResponse.json({ error: "Revision requests require a coordinator note" }, { status: 400 });
  }

  const status = action === "APPROVE" ? "APPROVED" : "NEEDS_REVISION";
  const updated = await prisma.courseReport.update({
    where: { id: report.id },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedById: coordinator.id,
      comments: comment
        ? {
            create: {
              coordinatorId: coordinator.id,
              content: comment,
            },
          }
        : undefined,
    },
    include: {
      comments: {
        orderBy: { createdAt: "desc" },
        include: { coordinator: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json(updated);
}
