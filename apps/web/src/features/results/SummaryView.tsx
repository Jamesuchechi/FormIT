import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import type { Field } from "@formit/schema";
import { iterateResponses } from "../../lib/api.ts";
import { summarize, type FieldSummary, type ResponseRow, type VersionSchemas } from "./results.ts";

/** Summaries aggregate client-side, so cap how many rows we pull. */
export const SUMMARY_ROW_CAP = 5000;

const PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#14b8a6",
  "#a855f7",
];

async function loadForSummary(formId: string) {
  const rows: ResponseRow[] = [];
  for await (const batch of iterateResponses(formId)) {
    rows.push(...batch);
    if (rows.length >= SUMMARY_ROW_CAP) break;
  }
  return rows.slice(0, SUMMARY_ROW_CAP);
}

type Props = { formId: string; columns: Field[]; versions: VersionSchemas; total: number };

export function SummaryView({ formId, columns, versions, total }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["response-summary", formId],
    queryFn: () => loadForSummary(formId),
  });

  const summaries = useMemo(
    () => (data ? summarize(columns, data, versions) : []),
    [data, columns, versions],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }
  if (isError) {
    return (
      <p role="alert" className="mt-6 text-sm text-rose-600">
        Could not load the summary.
      </p>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-dashed border-neutral-200 bg-white p-12 text-center">
        <h2 className="font-bold text-neutral-900">No responses yet</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Charts and answers will appear once someone submits.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      {total > SUMMARY_ROW_CAP && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Summarizing the newest {SUMMARY_ROW_CAP.toLocaleString()} of {total.toLocaleString()}{" "}
          responses. Export CSV for the full data.
        </p>
      )}
      {summaries.map((s) => (
        <SummaryCard key={s.field.id} summary={s} />
      ))}
    </div>
  );
}

function SummaryCard({ summary }: { summary: FieldSummary }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-neutral-900">{summary.field.label}</h3>
      <p className="mt-0.5 text-xs text-neutral-500">
        {summary.answered} {summary.answered === 1 ? "answer" : "answers"}
        {summary.kind === "scale" && summary.average !== null && (
          <> · average {summary.average.toFixed(2)}</>
        )}
      </p>

      <div className="mt-4">
        {summary.kind === "choice" && <ChoiceChart summary={summary} />}
        {summary.kind === "scale" && <Histogram bars={summary.bars} />}
        {summary.kind === "files" && (
          <p className="text-sm text-neutral-600">
            {summary.fileCount} {summary.fileCount === 1 ? "file" : "files"} uploaded. Open a
            response to download.
          </p>
        )}
        {summary.kind === "text" && <TextList values={summary.values} />}
      </div>
    </section>
  );
}

function ChoiceChart({ summary }: { summary: Extract<FieldSummary, { kind: "choice" }> }) {
  const total = summary.bars.reduce((a, b) => a + b.count, 0);
  // Pie only makes sense when each respondent picks one option.
  const showPie = summary.field.type !== "checkboxes" && total > 0;

  let acc = 0;
  const stops = summary.bars
    .map((b, i) => {
      const start = (acc / total) * 100;
      acc += b.count;
      return `${PALETTE[i % PALETTE.length]} ${start}% ${(acc / total) * 100}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      {showPie && (
        <div
          role="img"
          aria-label="Pie chart of answers"
          className="h-36 w-36 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
        />
      )}
      <ul className="flex-1 space-y-2.5">
        {summary.bars.map((b, i) => {
          const pct = summary.answered > 0 ? (b.count / summary.answered) * 100 : 0;
          return (
            <li key={b.id}>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-neutral-800">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  {b.label}
                </span>
                <span className="tabular-nums text-neutral-500">
                  {b.count} ({pct.toFixed(0)}%)
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Histogram({ bars }: { bars: { id: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...bars.map((b) => b.count));
  return (
    <div className="flex h-40 items-end gap-2" role="img" aria-label="Histogram of scores">
      {bars.map((b) => (
        <div key={b.id} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs tabular-nums text-neutral-500">{b.count}</span>
          <div
            className="w-full rounded-t-md bg-indigo-500"
            style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count > 0 ? 4 : 0 }}
          />
          <span className="text-xs font-medium text-neutral-700">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

const TEXT_PREVIEW = 20;

function TextList({ values }: { values: string[] }) {
  const shown = values.slice(0, TEXT_PREVIEW);
  return (
    <>
      <ul className="space-y-2">
        {shown.map((v, i) => (
          <li
            key={i}
            className="whitespace-pre-wrap break-words rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-800"
          >
            {v}
          </li>
        ))}
      </ul>
      {values.length > TEXT_PREVIEW && (
        <p className="mt-2 text-xs text-neutral-500">
          Showing {TEXT_PREVIEW} of {values.length}. Use the Responses tab or CSV export for all.
        </p>
      )}
    </>
  );
}
