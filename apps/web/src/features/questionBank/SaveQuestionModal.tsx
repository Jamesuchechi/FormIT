import type { Field } from "@formit/schema";
import { BookmarkPlus, Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { saveQuestionToBank } from "./questionBankApi.ts";

interface SaveQuestionModalProps {
  isOpen: boolean;
  field: Field | null;
  onClose: () => void;
  onSaved?: () => void;
}

const COMMON_CATEGORIES = [
  "General",
  "Contact Info",
  "Feedback & Ratings",
  "Choice & Selection",
  "Files & Media",
];

export function SaveQuestionModal({ isOpen, field, onClose, onSaved }: SaveQuestionModalProps) {
  if (!isOpen || !field) return null;

  const [title, setTitle] = useState(field.label || "Untitled Question");
  const [category, setCategory] = useState("General");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const effectiveCategory = isCustomCategory ? customCategory.trim() || "General" : category;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!field) return;
    if (!title.trim()) {
      setError("Please provide a title for this question.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveQuestionToBank({
        title: title.trim(),
        category: effectiveCategory,
        field,
      });
      setSuccess(true);
      onSaved?.();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save question to question bank.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-question-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <BookmarkPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 id="save-question-title" className="text-base font-semibold text-neutral-900">
              Save to Question Bank
            </h2>
            <p className="text-xs text-neutral-500">
              Reuse this field configuration in any of your forms
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Saved to Question Bank!</p>
            <p className="text-xs text-neutral-500">You can now reuse this question anytime.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label
                htmlFor="save-q-title"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1"
              >
                Question Name in Bank
              </label>
              <input
                id="save-q-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Net Promoter Score or Job Experience"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="save-q-category"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1"
              >
                Category
              </label>
              {!isCustomCategory ? (
                <div className="space-y-2">
                  <select
                    id="save-q-category"
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setIsCustomCategory(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {COMMON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__new__">+ Create new category…</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter category name"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(false)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    ← Choose from existing categories
                  </button>
                </div>
              )}
            </div>

            {/* Field Details Preview Box */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 space-y-1">
              <div className="flex justify-between items-center text-neutral-800 font-medium">
                <span>Field Type:</span>
                <span className="capitalize font-semibold text-indigo-600">
                  {field.type.replace(/_/g, " ")}
                </span>
              </div>
              {field.helpText && (
                <p className="truncate text-neutral-500">Help text: {field.helpText}</p>
              )}
              {"options" in field &&
                Array.isArray((field as { options: unknown[] }).options) && (
                  <p className="text-neutral-500">
                    Options: {(field as { options: unknown[] }).options.length} preset choice(s)
                  </p>
                )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    Save Question
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
