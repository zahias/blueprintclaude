import { NextResponse } from "next/server";
import { getInstructorFromCookies } from "@/lib/instructorAuth";

export async function GET() {
  const instructor = await getInstructorFromCookies();
  if (!instructor) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ instructor });
}
