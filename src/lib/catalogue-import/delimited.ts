/**
 * Small RFC 4180 style parser for CSV / TSV / semicolon files.
 * Pure and dependency-free so it runs in the browser, on the server and in tests.
 */
export type ParsedTable = { headers: string[]; records: Record<string, string>[]; delimiter: string };

export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function detectDelimiter(firstLine: string): string {
  let best = ",";
  let bestCount = -1;
  for (const candidate of [",", ";", "\t"]) {
    let count = 0;
    let inQuotes = false;
    for (const char of firstLine) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === candidate && !inQuotes) count += 1;
    }
    if (count > bestCount) { best = candidate; bestCount = count; }
  }
  return best;
}

export function parseDelimited(input: string): ParsedTable {
  const text = input.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r\n|\n|\r/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += char;
    } else if (char === '"' && field === "") {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field); field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += char;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter(r => r.some(cell => cell.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], records: [], delimiter };

  const seen = new Map<string, number>();
  const headers = nonEmpty[0].map((raw, index) => {
    const base = raw.trim() || `Column ${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
  const records = nonEmpty.slice(1).map(cells => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => { record[header] = (cells[index] ?? "").trim(); });
    return record;
  });
  return { headers, records, delimiter };
}
