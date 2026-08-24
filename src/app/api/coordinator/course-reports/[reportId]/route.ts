import { NextRequest, NextResponse } from "next/server";
import { coordinatorCanAccessCourseReport } from "@/lib/courseReports.server";
import { getVerifiedCoordinator } from "@/lib/session.server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reportId } = await params;
  const report = await coordinatorCanAccessCourseReport(reportId, coordinator);
  if (!report) return NextResponse.json({ error: "Course report not found" }, { status: 404 });

  return NextResponse.json(report);
}
