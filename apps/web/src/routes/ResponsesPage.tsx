import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getFileDownloadUrl,
  getFormVersions,
  getOwnerForm,
  getResponsesPage,
  deleteAllResponses,
  deleteResponse,
  updateForm,
  type ResponseSort,
} from "../lib/api.ts";
import { ResponseDetail } from "../features/results/ResponseDetail.tsx";
import { SummaryView } from "../features/results/SummaryView.tsx";
import { exportCsv } from "../features/results/exportCsv.ts";
import {
  buildColumns,
  formatResponseAnswer,
  type ResponseRow,
} from "../features/results/results.ts";

const PAGE_SIZE = 25;

export function ResponsesPage() {
  const { id = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"summary" | "responses">("summary");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<ResponseSort>({ key: "submitted_at", ascending: false });
  const [selected, setSelected] = useState<ResponseRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const formQuery = useQuery({ queryKey: ["owner-form", id], queryFn: () => getOwnerForm(id) });
  const versionsQuery = useQuery({
    queryKey: ["form-versions", id],
    queryFn: () => getFormVersions(id),
  });
  const pageQuery = useQuery({
    queryKey: ["responses", id, page, sort],
    queryFn: () => getResponsesPage(id, { page, pageSize: PAGE_SIZE, sort }),
    placeholderData: (prev) => prev,
  });

  const form = formQuery.data;
  const versions = versionsQuery.data;

  const columns = useMemo(
    () => (form && versions ? buildColumns(form.schema, versions) : []),
    [form, versions],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["responses", id] });
    void queryClient.invalidateQueries({ queryKey: ["response-summary", id] });
    void queryClient.invalidateQueries({ queryKey: ["user-forms"] });
  };

  const deleteOne = useMutation({
    mutationFn: (rid: string) => deleteResponse(rid),
    onSuccess: () => {
      setSelected(null);
      invalidate();
    },
  });
  const deleteAll = useMutation({
    mutationFn: () => deleteAllResponses(id),
    onSuccess: () => {
      setSelected(null);
      setPage(0);
      invalidate();
    },
  });
  const toggleStatus = useMutation({
    mutationFn: (status: "open" | "closed") => updateForm(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["owner-form", id] });
      void queryClient.invalidateQueries({ queryKey: ["user-forms"] });
    },
  });

  if (formQuery.isLoading || versionsQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!form || !versions) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-600" />
        <h1 className="text-lg font-bold">Form not found or inaccessible</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Back to forms
        </Link>
      </div>
    );
  }

  const total = pageQuery.data?.total ?? 0;
  const rows = pageQuery.data?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isOpen = form.status === "open";

  function toggleSort(key: string) {
    setPage(0);
    setSort((s) => (s.key === key ? { key, ascending: !s.ascending } : { key, ascending: true }));
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      await exportCsv(id, form!.slug, columns, versions!);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function handleDeleteAll() {
    if (
      window.confirm(`Delete all ${total} responses to "${form!.title}"? This cannot be undone.`)
    ) {
      deleteAll.mutate();
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> Forms
      </Link>

      <div className="mt-3 flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-neutral-900">
            {form.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {total} {total === 1 ? "response" : "responses"} ·{" "}
            <Link to={`/forms/${id}/edit`} className="text-indigo-600 hover:underline">
              Edit form
            </Link>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={isOpen}
            onClick={() => toggleStatus.mutate(isOpen ? "closed" : "open")}
            disabled={toggleStatus.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <span
              className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-500" : "bg-neutral-400"}`}
            />
            {isOpen ? "Accepting responses" : "Not accepting responses"}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={deleteAll.isPending || total === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Delete all
          </button>
        </div>
      </div>

      {exportError && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {exportError}
        </p>
      )}

      <div role="tablist" className="mt-6 inline-flex w-full sm:w-auto rounded-lg bg-neutral-100 p-1">
        {(
          [
            ["summary", "Summary", BarChart3],
            ["responses", "Responses", Table2],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <SummaryView formId={id} columns={columns} versions={versions} total={total} />
      ) : (
        <section className="mt-6" aria-label="Responses table">
          {total === 0 && !pageQuery.isLoading ? (
            <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-white p-12 text-center">
              <h2 className="font-bold text-neutral-900">No responses yet</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Share your form link and answers will show up here.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white -mx-2 sm:mx-0 shadow-2xs">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <SortHeader
                        label="Submitted"
                        sortKey="submitted_at"
                        sort={sort}
                        onSort={toggleSort}
                      />
                      {columns.map((c) => (
                        <SortHeader
                          key={c.id}
                          label={c.label}
                          sortKey={c.id}
                          sort={sort}
                          onSort={toggleSort}
                          sortable={c.type !== "checkboxes" && c.type !== "file_upload"}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(r)}
                        onKeyDown={(e) => e.key === "Enter" && setSelected(r)}
                        tabIndex={0}
                        className="cursor-pointer hover:bg-indigo-50/40 focus:bg-indigo-50/60 focus:outline-none"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                          {new Date(r.submittedAt).toLocaleString()}
                        </td>
                        {columns.map((c) => {
                          const text = formatResponseAnswer(r, c, versions);
                          return (
                            <td
                              key={c.id}
                              className={`max-w-[18rem] truncate px-4 py-3 ${
                                c.type === "linear_scale" ? "text-right tabular-nums" : ""
                              }`}
                              title={text}
                            >
                              {text || <span className="text-neutral-300">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
                <span>
                  Page {page + 1} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg border border-neutral-200 bg-white p-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={page >= pageCount - 1}
                    className="rounded-lg border border-neutral-200 bg-white p-2 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {selected && (
        <aside
          role="dialog"
          aria-label="Response detail"
          className="fixed inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col border-l border-neutral-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <h2 className="font-bold text-neutral-900">Response</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setSelected(null)}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <ResponseDetail
              response={selected}
              columns={columns}
              versions={versions}
              currentVersion={form.schemaVersion}
              getDownloadUrl={getFileDownloadUrl}
            />
          </div>
          <div className="border-t border-neutral-200 p-4">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete this response? This cannot be undone.")) {
                  deleteOne.mutate(selected.id);
                }
              }}
              disabled={deleteOne.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Delete response
            </button>
          </div>
        </aside>
      )}
    </main>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  sortable = true,
}: {
  label: string;
  sortKey: string;
  sort: ResponseSort;
  onSort: (key: string) => void;
  sortable?: boolean;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.ascending ? "ascending" : "descending") : "none"}
      className="whitespace-nowrap px-4 py-3 font-semibold"
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className="inline-flex max-w-[14rem] items-center gap-1 truncate uppercase hover:text-neutral-900"
        >
          <span className="truncate">{label}</span>
          {active &&
            (sort.ascending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        </button>
      ) : (
        <span className="inline-block max-w-[14rem] truncate">{label}</span>
      )}
    </th>
  );
}
