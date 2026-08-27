import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getVerifiedCoordinator } from "@/lib/session.server";
import { isMissingSchemaError, missingSchemaResponse } from "@/lib/apiErrors";

export async function GET() {
  try {
    const coordinator = await getVerifiedCoordinator();
    if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const terms = await prisma.academicTerm.findMany({
      orderBy: [{ academicYear: "desc" }, { semester: "asc" }],
      include: { _count: { select: { offerings: true } } },
    });
    return NextResponse.json(terms);
  } catch (error) {
    if (isMissingSchemaError(error)) return missingSchemaResponse();
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const coordinator = await getVerifiedCoordinator();
    if (!coordinator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { semester, academicYear } = await req.json() as { semester?: string; academicYear?: string };
    if (!["FALL", "SPRING", "SUMMER"].includes(semester || "") || !academicYear?.trim()) {
      return NextResponse.json({ error: "Semester and academic year are required" }, { status: 400 });
    }

    const term = await prisma.academicTerm.upsert({
      where: { semester_academicYear: { semester: semester as "FALL" | "SPRING" | "SUMMER", academicYear: academicYear.trim() } },
      update: {},
      create: { semester: semester as "FALL" | "SPRING" | "SUMMER", academicYear: academicYear.trim() },
    });

    return NextResponse.json(term, { status: 201 });
  } catch (error) {
    if (isMissingSchemaError(error)) return missingSchemaResponse();
    throw error;
  }
}
