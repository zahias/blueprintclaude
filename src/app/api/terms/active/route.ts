import { NextResponse } from "next/server";
import { getActiveTerm } from "@/lib/terms.server";
import { isMissingSchemaError, missingSchemaResponse } from "@/lib/apiErrors";

export async function GET() {
  try {
    const term = await getActiveTerm();
    return NextResponse.json(term);
  } catch (error) {
    if (isMissingSchemaError(error)) return missingSchemaResponse();
    throw error;
  }
}
