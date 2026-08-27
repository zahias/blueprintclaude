import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await req.formData().catch(() => null);
  return NextResponse.json(
    { error: "Bulk Excel import is retired. Use progress report and syllabus import instead." },
    { status: 410 }
  );
}
