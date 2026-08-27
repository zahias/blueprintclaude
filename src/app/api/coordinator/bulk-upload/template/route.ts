import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Bulk Excel import is retired. Use progress report and syllabus import instead." },
    { status: 410 }
  );
}
