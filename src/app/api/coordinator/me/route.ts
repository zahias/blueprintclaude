import { NextResponse } from "next/server";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";
import prisma from "@/lib/prisma";
import { clearRoleCookies } from "@/lib/cookies";

export async function GET() {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbCoordinator = await prisma.coordinator.findUnique({
    where: { id: coordinator.id },
    select: { id: true, email: true, name: true, isActive: true },
  });
  if (!dbCoordinator || !dbCoordinator.isActive) {
    const response = NextResponse.json({ error: "Stale or inactive session. Please log in again." }, { status: 401 });
    clearRoleCookies(response);
    return response;
  }

  return NextResponse.json({ coordinator: dbCoordinator });
}
