import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; loId: string }> }
) {
  await params;
  await req.json().catch(() => null);
  return NextResponse.json(
    { error: "CLOs are managed through syllabus import for the selected term." },
    { status: 410 }
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; loId: string }> }
) {
  await params;
  return NextResponse.json(
    { error: "CLOs imported for term history cannot be deleted through the legacy CLO API." },
    { status: 410 }
  );
}
