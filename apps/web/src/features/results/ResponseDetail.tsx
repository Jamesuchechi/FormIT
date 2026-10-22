import { FileText } from "lucide-react";
import { useState } from "react";
import type { Field, FileAnswer } from "@formit/schema";
import {
  fieldForResponse,
  formatAnswer,
  type ResponseRow,
  type VersionSchemas,
} from "./results.ts";

type Props = {
  response: ResponseRow;
  columns: Field[];
  versions: VersionSchemas;
  currentVersion: number;
  getDownloadUrl: (path: string) => Promise<string>;
};

/**
 * One response rendered against the schema version it was submitted with. Questions that
 * only exist in other versions are omitted rather than shown as blank.
 */
export function ResponseDetail({
  response,
  columns,
  versions,
  currentVersion,
  getDownloadUrl,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const schema = versions[response.schemaVersion];
  const knownIds = schema
    ? new Set(schema.sections.flatMap((s) => s.fields.map((f) => f.id)))
    : null;

  async function download(path: string) {
    setError(null);
    try {
      window.open(await getDownloadUrl(path), "_blank", "noopener,noreferrer");
    } catch {
      setError("Could not create a download link.");
    }
  }

  const shown = columns.filter((c) => (knownIds ? knownIds.has(c.id) : c.id in response.answers));

  return (
    <div>
      <dl className="mb-6 grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 text-xs text-neutral-600">
        <div>
          <dt className="font-semibold text-neutral-800">Submitted</dt>
          <dd>{new Date(response.submittedAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="font-semibold text-neutral-800">Respondent</dt>
          <dd className="truncate">{response.respondentId ?? "Anonymous"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-neutral-800">Form version</dt>
          <dd>
            v{response.schemaVersion}
            {response.schemaVersion !== currentVersion && " (older version)"}
          </dd>
        </div>
      </dl>

      <div className="space-y-5">
        {shown.map((column) => {
          const field = fieldForResponse(response, column.id, versions, column);
          const value = response.answers[column.id];
          const files =
            field.type === "file_upload" && Array.isArray(value) ? (value as FileAnswer[]) : [];
          const text = formatAnswer(field, value);
          return (
            <div key={column.id}>
              <h3 className="text-sm font-semibold text-neutral-900">{field.label}</h3>
              {files.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {files.map((f) => (
                    <li key={f.path}>
                      <button
                        type="button"
                        onClick={() => void download(f.path)}
                        className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
                      >
                        <FileText className="h-4 w-4" /> {f.name}
                        <span className="text-xs text-neutral-400">
                          ({Math.round(f.size / 1024)} kB)
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-700">
                  {text || <span className="text-neutral-400">No answer</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
