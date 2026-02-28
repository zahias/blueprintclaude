import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

// Fetch blueprint by accessToken (public) or by id (admin)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Try by accessToken first (public access), then by id (admin access)
  let blueprint = await prisma.blueprint.findUnique({
    where: { accessToken: token },
    include: {
      course: {
        include: {
          major: true,
          topics: {
            orderBy: { sortOrder: "asc" },
            include: { los: { include: { learningOutcome: true } } },
          },
          los: { orderBy: { code: "asc" } },
        },
      },
      topics: {
        include: {
          topic: { include: { los: { include: { learningOutcome: true } } } },
          questionTypes: true,
        },
      },
      comments: {
        include: { admin: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!blueprint) {
    // Try by ID (admin only)
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

    blueprint = await prisma.blueprint.findUnique({
      where: { id: token },
      include: {
        course: {
          include: {
            major: true,
            topics: {
              orderBy: { sortOrder: "asc" },
              include: { los: { include: { learningOutcome: true } } },
            },
            los: { orderBy: { code: "asc" } },
          },
        },
        topics: {
          include: {
            topic: { include: { los: { include: { learningOutcome: true } } } },
            questionTypes: true,
          },
        },
        comments: {
          include: { admin: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  if (!blueprint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(blueprint);
}

// Update blueprint (public via accessToken if DRAFT)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();

  const existing = await prisma.blueprint.findUnique({
    where: { accessToken: token },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only allow editing DRAFT or REJECTED blueprints
  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json(
        { error: "Blueprint is submitted and cannot be edited" },
        { status: 403 }
      );
    }
  }

  const { instructorName, title, examDate, duration, totalMarks, topics, status, semester, academicYear } = body;

  // Delete existing blueprint topics and recreate
  await prisma.blueprintTopic.deleteMany({ where: { blueprintId: existing.id } });

  const blueprint = await prisma.blueprint.update({
    where: { id: existing.id },
    data: {
      instructorName,
      title,
      examDate: examDate ? new Date(examDate) : null,
      duration: duration || null,
      totalMarks: parseFloat(totalMarks),
      status: status || existing.status,
      semester: semester || null,
      academicYear: academicYear || null,
      topics: topics?.length
        ? {
            create: topics.map(
              (t: {
                topicId: string;
                questionCount: number;
                totalPoints: number;
                bloomRemember: number;
                bloomUnderstand: number;
                bloomApply: number;
                bloomAnalyze: number;
                bloomEvaluate: number;
                bloomCreate: number;
                questionTypes: { questionType: string; count: number }[];
              }) => ({
                topicId: t.topicId,
                questionCount: t.questionCount,
                totalPoints: t.totalPoints,
                bloomRemember: t.bloomRemember || 0,
                bloomUnderstand: t.bloomUnderstand || 0,
                bloomApply: t.bloomApply || 0,
                bloomAnalyze: t.bloomAnalyze || 0,
                bloomEvaluate: t.bloomEvaluate || 0,
                bloomCreate: t.bloomCreate || 0,
                questionTypes: t.questionTypes?.length
                  ? {
                      create: t.questionTypes.map(
                        (qt: { questionType: string; count: number }) => ({
                          questionType: qt.questionType,
                          count: qt.count,
                        })
                      ),
                    }
                  : undefined,
              })
            ),
          }
        : undefined,
    },
    include: {
      topics: { include: { questionTypes: true, topic: true } },
    },
  });

  return NextResponse.json(blueprint);
}
