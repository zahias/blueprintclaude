export function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

export function csvRows(rows: (string | number | null | undefined)[][]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      i++;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseCsv(text: string) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] };
  return {
    headers: parseCsvLine(lines[0]).map((header) => header.replace(/^"|"$/g, "").trim()),
    rows: lines.slice(1).map((line) => parseCsvLine(line).map((cell) => cell.replace(/^"|"$/g, "").trim())),
  };
}
