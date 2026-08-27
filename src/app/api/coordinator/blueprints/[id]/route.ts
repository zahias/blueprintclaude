import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { getCoordinatorMajorIds } from "@/lib/gradebook.server";
import { notifyBlueprintStatusChange } from "@/lib/email";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const majorIds = await getCoordinatorMajorIds(coordinator);

  const blueprint = await prisma.blueprint.findFirst({
    where: { id, course: { majorId: { in: majorIds } } },
    include: {
      course: {
        include: {
          major: { select: { name: true } },
          los: { select: { id: true, code: true, description: true } },
        },
      },
      topics: {
        include: {
          topic: {
            include: {
              los: { include: { learningOutcome: { select: { code: true } } } },
            },
          },
        },
      },
      questionFormats: true,
      comments: {
        include: {
          admin: { select: { name: true } },
          coordinator: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!blueprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(blueprint);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["APPROVED", "NEEDS_REVISION"].includes(status)) {
    return NextResponse.json({ error: "Status must be APPROVED or NEEDS_REVISION" }, { status: 400 });
  }

  const majorIds = await getCoordinatorMajorIds(coordinator);
  const blueprint = await prisma.blueprint.findFirst({ where: { id, course: { majorId: { in: majorIds } } } });
  if (!blueprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.blueprint.update({
    where: { id },
    data: { status },
  });

  notifyBlueprintStatusChange(id, status);

  return NextResponse.json(updated);
}
