import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const blueprint = await prisma.blueprint.findUnique({
    where: { id },
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
          questionTypes: true,
        },
      },
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
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Status must be APPROVED or REJECTED" }, { status: 400 });
  }

  const blueprint = await prisma.blueprint.findUnique({ where: { id } });
  if (!blueprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.blueprint.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}
