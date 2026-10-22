import { iterateResponses } from "../../lib/api.ts";
import type { Field } from "@formit/schema";
import { csvHeader, responseToCsvRow, type VersionSchemas } from "./results.ts";

/**
 * Export every response as CSV. Pages through the API in batches and accumulates
 * encoded chunks as Blob parts, so memory stays bounded by the file, not by JS strings
 * and row objects for the whole form.
 */
export async function buildCsvBlob(
  batches: AsyncIterable<Parameters<typeof responseToCsvRow>[0][]>,
  columns: Field[],
  versions: VersionSchemas,
): Promise<Blob> {
  const parts: BlobPart[] = ["\uFEFF", csvHeader(columns)];
  for await (const batch of batches) {
    parts.push(batch.map((r) => responseToCsvRow(r, columns, versions)).join(""));
  }
  return new Blob(parts, { type: "text/csv;charset=utf-8" });
}

export async function exportCsv(
  formId: string,
  slug: string,
  columns: Field[],
  versions: VersionSchemas,
): Promise<void> {
  const blob = await buildCsvBlob(iterateResponses(formId), columns, versions);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}-responses.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
