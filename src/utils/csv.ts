import type { Submission } from "../types";

/**
 * Generate CSV from submissions array
 * Includes all fields from submission data plus metadata
 */
export function generateCsv(submissions: Submission[]): string {
  if (submissions.length === 0) {
    return "No submissions found";
  }

  // Collect all unique field names from all submissions
  const fieldNames = new Set<string>();
  for (const submission of submissions) {
    if (submission.data && typeof submission.data === "object") {
      Object.keys(submission.data).forEach((key) => {
        // Skip special fields (underscore prefix)
        if (!key.startsWith("_")) {
          fieldNames.add(key);
        }
      });
    }
  }

  // Standard columns + dynamic field columns
  const headers = [
    "id",
    "created_at",
    "is_read",
    "ip_address",
    ...Array.from(fieldNames).sort(),
  ];

  // Build CSV rows
  const rows: string[] = [];

  // Header row
  rows.push(headers.map(escapeCell).join(","));

  // Data rows
  for (const submission of submissions) {
    const row: string[] = [];

    // Standard fields
    row.push(escapeCell(submission.id));
    row.push(escapeCell(submission.created_at));
    row.push(escapeCell(submission.is_read ? "Yes" : "No"));
    row.push(escapeCell(submission.ip_address || ""));

    // Dynamic fields
    for (const field of Array.from(fieldNames).sort()) {
      const value = submission.data?.[field];
      row.push(escapeCell(formatValue(value)));
    }

    rows.push(row.join(","));
  }

  // Add UTF-8 BOM for Excel compatibility
  return "\ufeff" + rows.join("\r\n");
}

/**
 * Escape a cell value for CSV
 */
function escapeCell(value: string): string {
  if (!value) return "";

  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }

  return value;
}

/**
 * Format a value for CSV output
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
