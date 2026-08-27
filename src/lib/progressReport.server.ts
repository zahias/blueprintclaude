import * as XLSX from "xlsx";

export interface ProgressRegistration {
  studentId: string;
  studentName: string;
  reportMajor: string;
  degree: string;
  courseCode: string;
  prefix: string;
  reportTerm: string;
  sourceCell: string;
}

export interface ProgressReportParseResult {
  registrations: ProgressRegistration[];
  prefixes: { prefix: string; registrations: number; courses: number; students: number }[];
  courses: { courseCode: string; prefix: string; registrations: number; students: number }[];
  warnings: string[];
  skippedRows: string[];
}

function normalizeCell(value: unknown) {
  return String(value ?? "").trim();
}

export function coursePrefix(courseCode: string) {
  return (courseCode.match(/^[A-Za-z]+/)?.[0] || "").toUpperCase();
}

export function termToReportCode(semester: string, academicYear: string) {
  const startYear = academicYear.match(/\d{4}/)?.[0] || academicYear;
  return `${semester.toUpperCase()}-${startYear}`;
}

export function splitDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "Student" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Student" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function parseProgressReport(buffer: Buffer, expectedReportTerm?: string): ProgressReportParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { registrations: [], prefixes: [], courses: [], warnings: ["Workbook has no sheets."], skippedRows: [] };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], { defval: "" });
  const registrations: ProgressRegistration[] = [];
  const warnings: string[] = [];
  const skippedRows: string[] = [];
  const mismatchedTerms = new Set<string>();

  rows.forEach((row, index) => {
    const studentId = normalizeCell(row.ID);
    const studentName = normalizeCell(row.NAME);
    const reportMajor = normalizeCell(row.MAJOR);
    const degree = normalizeCell(row.DEGREE);
    if (!studentId || !studentName) {
      skippedRows.push(`Row ${index + 2}: missing student ID or name.`);
      return;
    }

    Object.entries(row).forEach(([header, value]) => {
      if (!/^COURSE/i.test(header)) return;
      const raw = normalizeCell(value);
      if (!raw) return;
      const parts = raw.split("/");
      if (parts.length < 3) {
        skippedRows.push(`Row ${index + 2}: invalid course cell "${raw}".`);
        return;
      }

      const courseCode = normalizeCell(parts[0]).toUpperCase();
      const reportTerm = normalizeCell(parts[1]).toUpperCase();
      const grade = parts.slice(2).join("/").trim();
      if (!courseCode || !reportTerm || grade) return;

      if (expectedReportTerm && reportTerm !== expectedReportTerm) mismatchedTerms.add(reportTerm);
      const prefix = coursePrefix(courseCode);
      if (!prefix) {
        skippedRows.push(`Row ${index + 2}: could not detect course prefix for "${courseCode}".`);
        return;
      }

      registrations.push({
        studentId,
        studentName,
        reportMajor,
        degree,
        courseCode,
        prefix,
        reportTerm,
        sourceCell: raw,
      });
    });
  });

  if (mismatchedTerms.size > 0) {
    warnings.push(`Some current registrations are for report term(s) outside the active term: ${Array.from(mismatchedTerms).sort().join(", ")}.`);
  }
  if (registrations.length === 0) warnings.push("No currently registered courses were found. Blank grade cells are required.");

  const prefixMap = new Map<string, ProgressRegistration[]>();
  const courseMap = new Map<string, ProgressRegistration[]>();
  registrations.forEach((registration) => {
    if (!prefixMap.has(registration.prefix)) prefixMap.set(registration.prefix, []);
    prefixMap.get(registration.prefix)!.push(registration);
    if (!courseMap.has(registration.courseCode)) courseMap.set(registration.courseCode, []);
    courseMap.get(registration.courseCode)!.push(registration);
  });

  const prefixes = Array.from(prefixMap.entries()).map(([prefix, items]) => ({
    prefix,
    registrations: items.length,
    courses: new Set(items.map((item) => item.courseCode)).size,
    students: new Set(items.map((item) => item.studentId)).size,
  })).sort((a, b) => a.prefix.localeCompare(b.prefix));

  const courses = Array.from(courseMap.entries()).map(([courseCode, items]) => ({
    courseCode,
    prefix: items[0].prefix,
    registrations: items.length,
    students: new Set(items.map((item) => item.studentId)).size,
  })).sort((a, b) => a.courseCode.localeCompare(b.courseCode));

  return { registrations, prefixes, courses, warnings, skippedRows };
}
