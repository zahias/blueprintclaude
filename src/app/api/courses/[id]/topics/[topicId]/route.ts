import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; topicId: string }> }
) {
  await params;
  await req.json().catch(() => null);
  return NextResponse.json(
    { error: "Topics are managed through syllabus import for the selected term." },
    { status: 410 }
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; topicId: string }> }
) {
  await params;
  return NextResponse.json(
    { error: "Topics imported for term history cannot be deleted through the legacy topic API." },
    { status: 410 }
  );
}
