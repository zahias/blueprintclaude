import { NextResponse } from "next/server";

export function isMissingSchemaError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: string }).code
    : undefined;
  return code === "P2021" || code === "P2022";
}

export function missingSchemaResponse() {
  return NextResponse.json(
    {
      error: "Database schema is not up to date. Apply the Prisma schema before using this workflow.",
      setupRequired: true,
    },
    { status: 503 }
  );
}
