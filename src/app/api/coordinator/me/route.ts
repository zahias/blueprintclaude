import { NextResponse } from "next/server";
import { getCoordinatorFromCookies } from "@/lib/coordinatorAuth";

export async function GET() {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ coordinator });
}
