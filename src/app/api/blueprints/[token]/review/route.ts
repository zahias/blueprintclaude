import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";
import { notifyBlueprintStatusChange } from "@/lib/email";

// Coordinator: update blueprint status (approve/reject)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const { status } = await req.json();

  if (!["APPROVED", "NEEDS_REVISION"].includes(status)) {
    return NextResponse.json({ error: "Status must be APPROVED or NEEDS_REVISION" }, { status: 400 });
  }

  // Find by id or accessToken
  let blueprint = await prisma.blueprint.findUnique({ where: { id: token } });
  if (!blueprint) {
    blueprint = await prisma.blueprint.findUnique({ where: { accessToken: token } });
  }
  if (!blueprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.blueprint.update({
    where: { id: blueprint.id },
    data: { status },
  });

  notifyBlueprintStatusChange(blueprint.id, status);

  return NextResponse.json(updated);
}
