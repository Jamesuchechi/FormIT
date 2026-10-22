import type { AnswerValue, Field, FileAnswer, FormSchema } from "@formit/schema";

/** A stored response, as returned by the owner-side responses API. */
export type ResponseRow = {
  id: string;
  respondentId: string | null;
  schemaVersion: number;
  answers: Record<string, AnswerValue | undefined>;
  submittedAt: string;
};

/** Every schema a response may have been submitted against, keyed by version. */
export type VersionSchemas = Record<number, FormSchema>;

export function flattenFields(schema: FormSchema): Field[] {
  return schema.sections.flatMap((s) => s.fields);
}

function optionsOf(field: Field): { id: string; label: string }[] {
  return "options" in field ? field.options : [];
}

/**
 * Columns are the union of fields across all versions, in current-schema order first,
 * followed by fields that only exist in older versions. The newest definition of each
 * field wins for the column header.
 */
export function buildColumns(current: FormSchema, versions: VersionSchemas): Field[] {
  const seen = new Map<string, Field>();
  for (const f of flattenFields(current)) seen.set(f.id, f);
  const versionNumbers = Object.keys(versions)
    .map(Number)
    .sort((a, b) => b - a);
  for (const v of versionNumbers) {
    for (const f of flattenFields(versions[v]!)) {
      if (!seen.has(f.id)) seen.set(f.id, f);
    }
  }
  return [...seen.values()];
}

/** Find the field definition a response was actually answered against. */
export function fieldForResponse(
  response: ResponseRow,
  fieldId: string,
  versions: VersionSchemas,
  fallback: Field,
): Field {
  const schema = versions[response.schemaVersion];
  if (!schema) return fallback;
  return flattenFields(schema).find((f) => f.id === fieldId) ?? fallback;
}

function isFileAnswers(v: unknown): v is FileAnswer[] {
  return Array.isArray(v) && v.every((x) => typeof x === "object" && x !== null && "path" in x);
}

/** Human readable text for one answer, resolving option ids to labels. */
export function formatAnswer(field: Field, value: AnswerValue | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  switch (field.type) {
    case "multiple_choice":
    case "dropdown": {
      const id = String(value);
      return optionsOf(field).find((o) => o.id === id)?.label ?? id;
    }
    case "checkboxes": {
      if (!Array.isArray(value)) return String(value);
      const opts = optionsOf(field);
      return (value as string[]).map((id) => opts.find((o) => o.id === id)?.label ?? id).join("; ");
    }
    case "file_upload":
      return isFileAnswers(value) ? value.map((f) => f.name).join("; ") : "";
    default:
      return String(value);
  }
}

/** Format an answer for a given response, honouring that response's schema version. */
export function formatResponseAnswer(
  response: ResponseRow,
  column: Field,
  versions: VersionSchemas,
): string {
  const field = fieldForResponse(response, column.id, versions, column);
  return formatAnswer(field, response.answers[column.id]);
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export type FieldSummary =
  | {
      kind: "choice";
      field: Field;
      answered: number;
      bars: { id: string; label: string; count: number }[];
    }
  | {
      kind: "scale";
      field: Field;
      answered: number;
      average: number | null;
      bars: { id: string; label: string; count: number }[];
    }
  | { kind: "text"; field: Field; answered: number; values: string[] }
  | { kind: "files"; field: Field; answered: number; fileCount: number };

export function summarize(
  columns: Field[],
  responses: ResponseRow[],
  versions: VersionSchemas,
): FieldSummary[] {
  return columns.map((field): FieldSummary => {
    const values = responses
      .map((r) => ({ r, v: r.answers[field.id] }))
      .filter(
        ({ v }) =>
          v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
      );
    const answered = values.length;

    if (
      field.type === "multiple_choice" ||
      field.type === "dropdown" ||
      field.type === "checkboxes"
    ) {
      const counts = new Map<string, { label: string; count: number }>();
      // Seed with current options so zero-count choices still show.
      for (const o of optionsOf(field)) counts.set(o.id, { label: o.label, count: 0 });
      for (const { r, v } of values) {
        const ids = Array.isArray(v) ? (v as string[]) : [String(v)];
        const old = fieldForResponse(r, field.id, versions, field);
        for (const id of ids) {
          const entry = counts.get(id) ?? {
            label: optionsOf(old).find((o) => o.id === id)?.label ?? id,
            count: 0,
          };
          entry.count += 1;
          counts.set(id, entry);
        }
      }
      return {
        kind: "choice",
        field,
        answered,
        bars: [...counts.entries()].map(([id, { label, count }]) => ({ id, label, count })),
      };
    }

    if (field.type === "linear_scale") {
      const counts = new Map<number, number>();
      for (let n = field.min; n <= field.max; n++) counts.set(n, 0);
      let sum = 0;
      let n = 0;
      for (const { v } of values) {
        const num = Number(v);
        if (!Number.isFinite(num)) continue;
        counts.set(num, (counts.get(num) ?? 0) + 1);
        sum += num;
        n += 1;
      }
      return {
        kind: "scale",
        field,
        answered,
        average: n > 0 ? sum / n : null,
        bars: [...counts.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([k, count]) => ({ id: String(k), label: String(k), count })),
      };
    }

    if (field.type === "file_upload") {
      const fileCount = values.reduce((acc, { v }) => acc + (Array.isArray(v) ? v.length : 0), 0);
      return { kind: "files", field, answered, fileCount };
    }

    return {
      kind: "text",
      field,
      answered,
      values: values.map(({ v }) => String(v)),
    };
  });
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Escape one CSV cell. Cells starting with = + - @ tab or CR are prefixed with a quote
 * so spreadsheet apps don't evaluate owner-visible respondent input as formulas.
 */
export function csvCell(raw: string): string {
  let s = raw;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(",") + "\r\n";
}

export function csvHeader(columns: Field[]): string {
  return csvRow(["Response ID", "Submitted at", "Respondent", ...columns.map((c) => c.label)]);
}

export function responseToCsvRow(
  response: ResponseRow,
  columns: Field[],
  versions: VersionSchemas,
): string {
  return csvRow([
    response.id,
    response.submittedAt,
    response.respondentId ?? "anonymous",
    ...columns.map((c) => formatResponseAnswer(response, c, versions)),
  ]);
}
