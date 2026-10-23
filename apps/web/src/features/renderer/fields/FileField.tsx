import { mimeAllowed } from "@formit/schema";
import type { FileAnswer } from "@formit/schema";
import { useState } from "react";
import { describeApiError } from "../../../lib/errors.ts";
import type { FieldInputProps } from "./types.ts";
import { linkButtonClass } from "./styles.ts";

type Props = FieldInputProps<"file_upload"> & {
  onUpload: (fieldId: string, file: File) => Promise<FileAnswer>;
};

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function FileInput({ field, value, onChange, ctl, onUpload }: Props) {
  const files = Array.isArray(value) ? (value as FileAnswer[]) : [];
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { maxFiles, maxSizeMb, accept } = field.validation;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file
    if (picked.length === 0) return;
    setLocalError(null);

    if (files.length + picked.length > maxFiles) {
      setLocalError(`You can upload at most ${maxFiles} file${maxFiles === 1 ? "" : "s"}.`);
      return;
    }
    for (const f of picked) {
      if (f.size > maxSizeMb * 1024 * 1024) {
        setLocalError(`${f.name} is larger than ${maxSizeMb} MB.`);
        return;
      }
      if (!mimeAllowed(f.type || "application/octet-stream", accept)) {
        setLocalError(`${f.name} is not an accepted file type.`);
        return;
      }
    }

    setBusy(true);
    try {
      const uploaded: FileAnswer[] = [];
      for (const f of picked) uploaded.push(await onUpload(field.id, f));
      onChange([...files, ...uploaded]);
    } catch (err) {
      setLocalError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        id={ctl.id}
        type="file"
        multiple={maxFiles > 1}
        accept={accept?.join(",")}
        disabled={busy || files.length >= maxFiles}
        onChange={(e) => void onPick(e)}
        aria-invalid={ctl.invalid}
        aria-describedby={ctl.describedBy}
        aria-required={field.required}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 dark:file:bg-neutral-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white dark:file:text-neutral-900 hover:file:bg-neutral-700 dark:hover:file:bg-neutral-200 disabled:opacity-60 cursor-pointer"
      />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Up to {maxFiles} file{maxFiles === 1 ? "" : "s"}, {maxSizeMb} MB each.
      </p>

      {busy && (
        <p role="status" className="text-sm text-neutral-600 dark:text-neutral-400">
          Uploading…
        </p>
      )}
      {localError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {localError}
        </p>
      )}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li
              key={f.path}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 px-3.5 py-2.5 text-sm"
            >
              <span className="truncate flex-1 text-neutral-900 dark:text-neutral-100">
                {f.name} <span className="text-neutral-500 dark:text-neutral-400 text-xs">({formatSize(f.size)})</span>
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((x) => x.path !== f.path))}
                className={`${linkButtonClass} text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex-shrink-0`}
                aria-label={`Remove ${f.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
