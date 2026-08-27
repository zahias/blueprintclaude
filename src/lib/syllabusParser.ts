import mammoth from "mammoth";

export interface ParsedSyllabusLO {
  code: string;
  description: string;
}

export interface ParsedSyllabusTopic {
  week: string;
  name: string;
  loCodes: string[];
  assessment: string | null;
  sortOrder: number;
}

export interface ParsedSyllabus {
  fileName: string;
  courseCode: string;
  courseName: string;
  learningOutcomes: ParsedSyllabusLO[];
  topics: ParsedSyllabusTopic[];
  warnings: string[];
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function normalize(value: string) {
  return decodeHtml(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cellText(html: string) {
  return normalize(
    html
      .replace(/<\/(p|li|div|br|ul|ol)>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function htmlToLines(html: string) {
  return html
    .replace(/<img[^>]*>/gi, "")
    .replace(/<\/(p|h1|h2|h3|li|tr|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map(normalize)
    .filter(Boolean);
}

function parseTables(html: string) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((match) => {
    const rows = [...match[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((rowMatch) => {
      return [...rowMatch[0].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((cellMatch) =>
        cellText(cellMatch[1])
      );
    });
    return rows.filter((row) => row.length > 0);
  });
}

function parseCourseCode(lines: string[]) {
  const courseCodeLine = lines.find((line) => /course\s+code\s*:/i.test(line));
  const explicit = courseCodeLine?.match(/course\s+code\s*:\s*([A-Z]{2,}\s*\d+[A-Z]?)/i)?.[1];
  if (explicit) return explicit.replace(/\s+/g, "").toUpperCase();

  const fallback = lines.join(" ").match(/\b[A-Z]{2,}\s*\d{3,}[A-Z]?\b/);
  return fallback ? fallback[0].replace(/\s+/g, "").toUpperCase() : "";
}

function parseCourseName(lines: string[], courseCode: string) {
  const syllabusIndex = lines.findIndex((line) => /^course syllabus$/i.test(line));
  if (syllabusIndex > 0) {
    const title = lines
      .slice(0, syllabusIndex)
      .reverse()
      .find((line) => !/college|department|spring|fall|summer|^\d{4}/i.test(line) && line.length > 6);
    if (title) return title;
  }

  const codeIndex = lines.findIndex((line) => line.includes(courseCode) || line.includes(courseCode.replace(/([A-Z]+)(\d+)/, "$1 $2")));
  const headingCandidates = lines.slice(0, codeIndex > 0 ? codeIndex : 12);
  const ignored = /college|department|course syllabus|spring|fall|summer|instructor|office|email|room|time|credits|prerequisites|^\d{4}/i;
  return headingCandidates.reverse().find((line) => line.length > 6 && !ignored.test(line)) || courseCode || "Imported Course";
}

function parseLearningOutcomes(lines: string[]) {
  const start = lines.findIndex((line) => /^Learning Outcomes:?$/i.test(line));
  if (start < 0) return [];

  const end = lines.findIndex((line, index) => index > start && /^(Student Learning Outcomes|Mapping Course Learning Outcomes|Students.? Duties|Grading System):?$/i.test(line));
  const section = lines.slice(start + 1, end > start ? end : start + 18);
  const outcomes: ParsedSyllabusLO[] = [];

  for (const line of section) {
    if (/^By the end/i.test(line)) continue;
    if (line.length < 20) continue;
    outcomes.push({ code: `CLO${outcomes.length + 1}`, description: line.replace(/^[-•\d.)\s]+/, "").trim() });
  }

  return outcomes;
}

function parseLoCodes(value: string) {
  return [...value.matchAll(/\d+/g)].map((match) => `CLO${Number(match[0])}`);
}

function cleanTopicName(value: string) {
  const withoutLearningOutcome = value.replace(/\bLearning outcome\s*:\s*.+$/i, "").trim();
  return withoutLearningOutcome.replace(/^Topic:\s*/i, "").trim();
}

function parseTopics(tables: string[][][]) {
  const schedule = tables.find((table) => {
    const header = table[0]?.join(" ").toLowerCase() || "";
    return header.includes("week") && header.includes("topic") && header.includes("clo");
  });
  if (!schedule) return [];

  const headers = schedule[0].map((header) => header.toLowerCase());
  const weekIndex = headers.findIndex((header) => header.includes("week"));
  const topicIndex = headers.findIndex((header) => header.includes("topic"));
  const cloIndex = headers.findIndex((header) => header.includes("clo"));
  const assessmentIndex = headers.findIndex((header) => header.includes("assessment"));

  return schedule
    .slice(1)
    .map((row, index) => {
      const rawTopic = row[topicIndex] || "";
      const name = cleanTopicName(rawTopic);
      return {
        week: row[weekIndex] || "",
        name,
        loCodes: parseLoCodes(row[cloIndex] || ""),
        assessment: assessmentIndex >= 0 && row[assessmentIndex] ? row[assessmentIndex] : null,
        sortOrder: index + 1,
      };
    })
    .filter((topic) => topic.name && !/^revision$/i.test(topic.name));
}

export async function parseSyllabusDocx(buffer: Buffer, fileName: string): Promise<ParsedSyllabus> {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
    }
  );
  const html = result.value.replace(/<img[^>]*>/gi, "");
  const lines = htmlToLines(html);
  const tables = parseTables(html);
  const courseCode = parseCourseCode(lines);
  const courseName = parseCourseName(lines, courseCode);
  const learningOutcomes = parseLearningOutcomes(lines);
  const topics = parseTopics(tables);
  const warnings = result.messages
    .map((message) => message.message)
    .filter((message) => !/^Unrecognised paragraph style/i.test(message));

  if (!courseCode) warnings.push("Could not detect a course code.");
  if (learningOutcomes.length === 0) warnings.push("Could not detect course learning outcomes.");
  if (topics.length === 0) warnings.push("Could not detect a weekly topics table with CLO mappings.");

  const loCodeSet = new Set(learningOutcomes.map((lo) => lo.code));
  for (const topic of topics) {
    for (const loCode of topic.loCodes) {
      if (!loCodeSet.has(loCode)) warnings.push(`${topic.name}: ${loCode} is referenced but was not detected in the learning outcomes list.`);
    }
  }

  return { fileName, courseCode, courseName, learningOutcomes, topics, warnings };
}
