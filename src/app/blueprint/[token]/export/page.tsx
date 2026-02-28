"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { BLOOM_LEVELS, QUESTION_TYPES } from "@/lib/constants";

interface Blueprint {
  id: string;
  accessToken: string;
  title: string;
  instructorName: string;
  examDate: string | null;
  duration: number | null;
  totalMarks: number;
  status: string;
  course: {
    code: string;
    name: string;
    major: { name: string };
    los: { id: string; code: string; description: string }[];
  };
  topics: {
    topicId: string;
    questionCount: number;
    totalPoints: number;
    bloomRemember: number;
    bloomUnderstand: number;
    bloomApply: number;
    bloomAnalyze: number;
    bloomEvaluate: number;
    bloomCreate: number;
    topic: {
      name: string;
      los: { learningOutcomeId: string; learningOutcome: { code: string } }[];
    };
    questionTypes: { questionType: string; count: number }[];
  }[];
}

export default function ExportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/blueprints/${token}`)
      .then((r) => r.json())
      .then(setBlueprint)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function generatePDF() {
    if (!blueprint) return;
    setGenerating(true);

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.text("Assessment Blueprint", pageWidth / 2, 20, { align: "center" });

    // Exam metadata
    doc.setFontSize(11);
    doc.text(`Title: ${blueprint.title}`, 14, 35);
    doc.text(`Course: ${blueprint.course.code} — ${blueprint.course.name}`, 14, 42);
    doc.text(`Major: ${blueprint.course.major.name}`, 14, 49);
    doc.text(`Instructor: ${blueprint.instructorName}`, 14, 56);
    doc.text(`Total Marks: ${blueprint.totalMarks}`, pageWidth / 2, 35);
    if (blueprint.duration) doc.text(`Duration: ${blueprint.duration} min`, pageWidth / 2, 42);
    if (blueprint.examDate) doc.text(`Date: ${new Date(blueprint.examDate).toLocaleDateString()}`, pageWidth / 2, 49);

    let y = 68;

    // Topic breakdown table
    const topicRows = blueprint.topics.map((bt) => [
      bt.topic.name,
      bt.topic.los.map((l) => l.learningOutcome.code).join(", "),
      bt.questionCount.toString(),
      bt.totalPoints.toString(),
      bt.bloomRemember.toString(),
      bt.bloomUnderstand.toString(),
      bt.bloomApply.toString(),
      bt.bloomAnalyze.toString(),
      bt.bloomEvaluate.toString(),
      bt.bloomCreate.toString(),
      bt.questionTypes.map((qt) => {
        const label = QUESTION_TYPES.find((q) => q.value === qt.questionType)?.label || qt.questionType;
        return `${label}: ${qt.count}`;
      }).join(", "),
    ]);

    // Add totals row
    const totalQ = blueprint.topics.reduce((s, t) => s + t.questionCount, 0);
    const totalP = blueprint.topics.reduce((s, t) => s + t.totalPoints, 0);
    topicRows.push([
      "TOTAL",
      "",
      totalQ.toString(),
      totalP.toString(),
      ...BLOOM_LEVELS.map((b) =>
        blueprint.topics.reduce((s, t) => s + ((t as unknown as Record<string, number>)[b.key] || 0), 0).toString()
      ),
      "",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Topic", "LOs", "Qs", "Pts", "Rem", "Und", "App", "Ana", "Eva", "Cre", "Q Types"]],
      body: topicRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [99, 102, 241] },
      theme: "grid",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 15;

    // LO Coverage table
    doc.setFontSize(12);
    doc.text("Learning Outcome Coverage", 14, y);
    y += 5;

    const loPointsMap: Record<string, number> = {};
    const loCoveredSet = new Set<string>();
    blueprint.topics.forEach((t) => {
      const topicLOs = t.topic.los || [];
      const pointsPerLO = topicLOs.length > 0 ? t.totalPoints / topicLOs.length : 0;
      topicLOs.forEach((tl) => {
        loCoveredSet.add(tl.learningOutcomeId);
        loPointsMap[tl.learningOutcomeId] = (loPointsMap[tl.learningOutcomeId] || 0) + pointsPerLO;
      });
    });

    const loRows = (blueprint.course.los || []).map((lo) => [
      lo.code,
      lo.description,
      loCoveredSet.has(lo.id) ? "Yes" : "NO",
      Math.round((loPointsMap[lo.id] || 0) * 10) / 10 + " pts",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Code", "Description", "Covered?", "Points"]],
      body: loRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [99, 102, 241] },
      theme: "grid",
      didParseCell: function (data) {
        if (data.section === "body" && data.column.index === 2) {
          if (data.cell.raw === "NO") {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
      },
    });

    // Bloom summary section
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 15;
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.text("Bloom's Taxonomy Summary", 14, y);
    y += 5;

    const lot = blueprint.topics.reduce((s, t) => s + t.bloomRemember + t.bloomUnderstand + t.bloomApply, 0);
    const hot = blueprint.topics.reduce((s, t) => s + t.bloomAnalyze + t.bloomEvaluate + t.bloomCreate, 0);
    const total = lot + hot;

    autoTable(doc, {
      startY: y,
      head: [["Category", "Questions", "Percentage"]],
      body: [
        ["Lower-Order Thinking (Remember, Understand, Apply)", lot.toString(), total > 0 ? Math.round((lot / total) * 100) + "%" : "0%"],
        ["Higher-Order Thinking (Analyze, Evaluate, Create)", hot.toString(), total > 0 ? Math.round((hot / total) * 100) + "%" : "0%"],
        ["Total", total.toString(), "100%"],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241] },
      theme: "grid",
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Assessment Blueprint Builder — Generated ${new Date().toLocaleDateString()} — Page ${i} of ${pageCount}`,
        pageWidth / 2, doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    doc.save(`blueprint-${blueprint.course.code}-${blueprint.title.replace(/\s+/g, "-")}.pdf`);
    setGenerating(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!blueprint) return <div className="min-h-screen flex items-center justify-center text-red-500">Blueprint not found</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Export Blueprint as PDF</h2>
          <p className="text-gray-500 mb-2">{blueprint.title}</p>
          <p className="text-sm text-gray-400 mb-6">
            {blueprint.course.code} — {blueprint.course.name}
          </p>

          <button
            onClick={generatePDF}
            disabled={generating}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {generating ? "Generating PDF..." : "Download PDF"}
          </button>

          <div className="mt-4 flex justify-center gap-4">
            <Link href={`/blueprint/${token}`} className="text-sm text-indigo-600 hover:text-indigo-800">
              View Blueprint
            </Link>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
