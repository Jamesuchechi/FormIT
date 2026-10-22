import { useState, useId } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle, Check, Loader2 } from "lucide-react";
import type { FieldOption } from "@formit/schema";
import { LIMITS } from "@formit/schema";
import { extractTextFromFile } from "./documentTextExtractor.ts";

interface ImportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOptions: FieldOption[];
  onImport: (newOptions: FieldOption[]) => void;
}

/**
 * Parses raw text or CSV content into a list of cleaned, non-empty option strings.
 * Supports:
 * - Line-by-line inputs
 * - Comma-separated values
 * - Tab-separated values (pasted from Excel / Google Sheets)
 * - Quoted CSV tokens
 */
/**
 * Robust CSV line splitter that correctly handles commas inside double quotes.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      const trimmed = current.trim().replace(/^["']|["']$/g, "").trim();
      if (trimmed) result.push(trimmed);
      current = "";
    } else {
      current += char;
    }
  }

  const finalTrimmed = current.trim().replace(/^["']|["']$/g, "").trim();
  if (finalTrimmed) result.push(finalTrimmed);

  return result;
}

export function parseOptionsText(rawText: string): string[] {
  if (!rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const results: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // If line contains tabs (e.g. copied spreadsheet column)
    if (trimmedLine.includes("\t")) {
      const parts = trimmedLine.split("\t");
      for (const p of parts) {
        const cleaned = p.replace(/^["']|["']$/g, "").trim();
        if (cleaned) results.push(cleaned);
      }
      continue;
    }

    // If line contains commas
    if (trimmedLine.includes(",")) {
      const tokens = splitCsvLine(trimmedLine);
      if (tokens.length > 0) {
        results.push(...tokens);
        continue;
      }
    }

    // Default: full line as one option
    const cleaned = trimmedLine.replace(/^["']|["']$/g, "").trim();
    if (cleaned) results.push(cleaned);
  }

  return results;
}

export function ImportOptionsModal({
  isOpen,
  onClose,
  currentOptions,
  onImport,
}: ImportOptionsModalProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [deduplicate, setDeduplicate] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputId = useId();

  if (!isOpen) return null;

  let parsed = parseOptionsText(text);
  if (deduplicate) {
    const seen = new Set<string>();
    parsed = parsed.filter((item) => {
      const lower = item.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }

  const existingCount = currentOptions.length;
  const totalCount = mode === "append" ? existingCount + parsed.length : parsed.length;
  const isOverLimit = totalCount > LIMITS.maxOptions;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsExtracting(true);
    setExtractError(null);

    try {
      const content = await extractTextFromFile(file);
      setText(content);
    } catch (err) {
      console.error("Failed to extract document text:", err);
      setExtractError(
        "Could not extract text from this document. Please check the file or copy and paste its text directly.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  function handleConfirm() {
    if (parsed.length === 0) return;

    const generateId = () => `opt_${Math.random().toString(36).substring(2, 9)}`;

    const newFieldOptions: FieldOption[] = parsed.map((label) => ({
      id: generateId(),
      label: label.slice(0, 300),
    }));

    let finalOptions: FieldOption[];
    if (mode === "append") {
      finalOptions = [...currentOptions, ...newFieldOptions];
    } else {
      finalOptions = newFieldOptions;
    }

    // Cap at maxOptions
    if (finalOptions.length > LIMITS.maxOptions) {
      finalOptions = finalOptions.slice(0, LIMITS.maxOptions);
    }

    onImport(finalOptions);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-options-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 id="import-options-title" className="text-base font-semibold text-neutral-900">
                Import / Bulk Add Options
              </h3>
              <p className="text-xs text-neutral-500">
                Paste choices or upload a CSV, TXT, DOCX, or PDF document
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* File Upload Drop Area */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100/70 transition-colors">
            <div className="flex items-center gap-2.5 text-xs text-neutral-600">
              {isExtracting ? (
                <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 text-neutral-500" />
              )}
              <span>
                {isExtracting ? (
                  <span className="text-indigo-600 font-medium">Extracting text from document…</span>
                ) : fileName ? (
                  <strong className="text-neutral-900">{fileName}</strong>
                ) : (
                  "Upload a .csv, .txt, .docx, or .pdf file"
                )}
              </span>
            </div>
            <label
              htmlFor={fileInputId}
              className={`cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-xs border border-neutral-200 hover:bg-neutral-50 ${
                isExtracting ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              Choose File
              <input
                id={fileInputId}
                type="file"
                accept=".csv,.txt,.docx,.pdf,text/plain,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                disabled={isExtracting}
                className="hidden"
              />
            </label>
          </div>

          {extractError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{extractError}</span>
            </div>
          )}

          {/* Paste Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="import-textarea" className="text-xs font-semibold text-neutral-700">
                Paste Options List
              </label>
              <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {parsed.length} {parsed.length === 1 ? "option" : "options"} detected
              </span>
            </div>
            <textarea
              id="import-textarea"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`United States\nCanada\nUnited Kingdom\nGermany\nFrance\n...`}
              className="w-full font-mono text-xs rounded-xl border border-neutral-300 p-3 text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {/* Import Modes and Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 block">Existing Options</label>
              <div className="flex items-center gap-3 text-xs text-neutral-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="import-mode"
                    value="replace"
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                    className="accent-indigo-600"
                  />
                  <span>Replace current ({existingCount})</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="import-mode"
                    value="append"
                    checked={mode === "append"}
                    onChange={() => setMode("append")}
                    className="accent-indigo-600"
                  />
                  <span>Append to existing</span>
                </label>
              </div>
            </div>

            <div className="flex items-end justify-start sm:justify-end">
              <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deduplicate}
                  onChange={(e) => setDeduplicate(e.target.checked)}
                  className="rounded border-neutral-300 accent-indigo-600 size-4"
                />
                <span>Remove duplicates</span>
              </label>
            </div>
          </div>

          {/* Over Limit Warning */}
          {isOverLimit && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Total options ({totalCount}) exceeds the maximum limit of {LIMITS.maxOptions}. Only
                the first {LIMITS.maxOptions} will be preserved.
              </span>
            </div>
          )}

          {/* Preview Chips */}
          {parsed.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Preview (First {Math.min(parsed.length, 8)} of {parsed.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                {parsed.slice(0, 8).map((opt, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs font-medium text-neutral-800 border border-neutral-200 shadow-2xs"
                  >
                    <span className="text-[10px] text-neutral-400">{i + 1}.</span>
                    {opt}
                  </span>
                ))}
                {parsed.length > 8 && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs text-neutral-400">
                    +{parsed.length - 8} more…
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200/60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={parsed.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Check className="h-4 w-4" />
            Import {parsed.length} {parsed.length === 1 ? "Option" : "Options"}
          </button>
        </div>
      </div>
    </div>
  );
}
