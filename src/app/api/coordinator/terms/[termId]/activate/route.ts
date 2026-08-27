import { NextResponse } from "next/server";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { activateTerm } from "@/lib/terms.server";
import { isMissingSchemaError, missingSchemaResponse } from "@/lib/apiErrors";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ termId: string }> }
) {
  const coordinator = await getVerifiedCoordinator();
  if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { termId } = await params;
    const term = await activateTerm(termId, coordinator.id);
    return NextResponse.json(term);
  } catch (error) {
    if (isMissingSchemaError(error)) return missingSchemaResponse();
    console.error("Term activation error:", error);
    return NextResponse.json({ error: "Could not activate term." }, { status: 500 });
  }
}
