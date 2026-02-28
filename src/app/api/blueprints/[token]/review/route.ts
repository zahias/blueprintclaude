import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

// Admin: update blueprint status (approve/reject)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const admin = await getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const { status } = await req.json();

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Status must be APPROVED or REJECTED" }, { status: 400 });
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

  return NextResponse.json(updated);
}
