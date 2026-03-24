import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

// GET assigned majors for a coordinator
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const assignments = await prisma.coordinatorMajor.findMany({
    where: { coordinatorId: id },
    include: { major: { select: { id: true, name: true } } },
  });

  return NextResponse.json(assignments.map((a) => a.major));
}

// PUT: replace all major assignments for a coordinator
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { majorIds } = await req.json();

  if (!Array.isArray(majorIds)) {
    return NextResponse.json({ error: "majorIds must be an array" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.coordinatorMajor.deleteMany({ where: { coordinatorId: id } }),
    ...majorIds.map((majorId: string) =>
      prisma.coordinatorMajor.create({ data: { coordinatorId: id, majorId } })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
