import { NextRequest, NextResponse } from "next/server";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { getActiveTerm } from "@/lib/terms.server";
import { parseProgressReport, termToReportCode } from "@/lib/progressReport.server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeTerm = await getActiveTerm();
  if (!activeTerm) return NextResponse.json({ error: "Activate a term before uploading a progress report." }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No Excel file uploaded" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Progress report must be an .xlsx file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const expectedReportTerm = termToReportCode(activeTerm.semester, activeTerm.academicYear);
  const parsed = parseProgressReport(buffer, expectedReportTerm);

  return NextResponse.json({
    ...parsed,
    activeTerm,
    expectedReportTerm,
    sourceFileName: file.name,
  });
}
