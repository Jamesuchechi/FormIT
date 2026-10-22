import type { Field } from "@formit/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  FileUp,
  Plus,
  Search,
  Sliders,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  deleteSavedQuestion,
  getSavedQuestions,
  type FieldTemplate,
  type SavedQuestion,
} from "./questionBankApi.ts";
import { QUESTION_PRESETS, type QuestionPreset } from "./questionPresets.ts";

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertQuestion: (template: FieldTemplate) => void;
}

const FIELD_ICONS: Record<string, ReactNode> = {
  short_text: <Type className="h-4 w-4 text-blue-500" />,
  long_text: <AlignLeft className="h-4 w-4 text-indigo-500" />,
  multiple_choice: <CircleDot className="h-4 w-4 text-emerald-500" />,
  checkboxes: <CheckSquare className="h-4 w-4 text-teal-500" />,
  dropdown: <ChevronDown className="h-4 w-4 text-amber-500" />,
  linear_scale: <Sliders className="h-4 w-4 text-purple-500" />,
  date: <Calendar className="h-4 w-4 text-pink-500" />,
  file_upload: <FileUp className="h-4 w-4 text-rose-500" />,
};

type UnifiedBankItem = {
  id: string;
  title: string;
  category: string;
  description?: string;
  field: FieldTemplate;
  isPreset: boolean;
  rawCustom?: SavedQuestion;
};

export function QuestionBankModal({ isOpen, onClose, onInsertQuestion }: QuestionBankModalProps) {
  if (!isOpen) return null;

  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const { data: savedQuestions = [], isLoading } = useQuery({
    queryKey: ["saved-questions"],
    queryFn: getSavedQuestions,
  });

  const allItems = useMemo<UnifiedBankItem[]>(() => {
    const customItems: UnifiedBankItem[] = savedQuestions.map((sq) => ({
      id: sq.id,
      title: sq.title,
      category: sq.category,
      description: sq.fieldDefinition.helpText || "Saved custom question",
      field: sq.fieldDefinition,
      isPreset: false,
      rawCustom: sq,
    }));

    const presetItems: UnifiedBankItem[] = QUESTION_PRESETS.map((qp: QuestionPreset) => ({
      id: qp.id,
      title: qp.title,
      category: qp.category,
      description: qp.description,
      field: qp.field,
      isPreset: true,
    }));

    return [...customItems, ...presetItems];
  }, [savedQuestions]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((item) => set.add(item.category));
    return ["All", "My Saved", ...Array.from(set).filter((c) => c !== "My Saved")];
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      // Category filter
      if (selectedCategory === "My Saved" && item.isPreset) return false;
      if (
        selectedCategory !== "All" &&
        selectedCategory !== "My Saved" &&
        item.category !== selectedCategory
      ) {
        return false;
      }

      // Search filter
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.field.type.toLowerCase().includes(q)
      );
    });
  }, [allItems, search, selectedCategory]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this question from your Question Bank?")) return;
    try {
      await deleteSavedQuestion(id);
      void queryClient.invalidateQueries({ queryKey: ["saved-questions"] });
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
  }

  function handleInsert(item: UnifiedBankItem) {
    onInsertQuestion(item.field);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-bank-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-neutral-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-neutral-50/50">
          <div>
            <h2 id="question-bank-modal-title" className="text-xl font-bold text-neutral-900">
              Question Bank
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Browse pre-configured questions and your saved custom definitions
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-neutral-200 bg-white space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions by name, type, or description…"
              className="w-full rounded-xl border border-neutral-300 pl-10 pr-4 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/30">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-neutral-400">Loading question bank…</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-medium text-neutral-700">No matching questions found</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {selectedCategory === "My Saved"
                  ? "You haven't saved any custom questions to your bank yet. Click 'Save to Bank' on any question card in the builder to add one."
                  : "Try clearing your search or switching categories."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const icon = FIELD_ICONS[item.field.type] || <Type className="h-4 w-4" />;

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 border border-neutral-200/80">
                            {icon}
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                            {item.field.type.replace(/_/g, " ")}
                          </span>
                        </div>

                        {!item.isPreset && item.rawCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(item.rawCustom!.id);
                            }}
                            title="Delete custom question"
                            className="rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-indigo-600 transition-colors">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Detail Pill / Summary */}
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-neutral-500">
                        <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600">
                          {item.category}
                        </span>
                        {item.field.required && (
                          <span className="rounded bg-red-50 px-2 py-0.5 font-medium text-red-600">
                            Required
                          </span>
                        )}
                        {"options" in item.field &&
                          Array.isArray((item.field as { options: unknown[] }).options) && (
                            <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-600">
                              {(item.field as { options: unknown[] }).options.length} options
                            </span>
                          )}
                        {item.field.type === "linear_scale" && (
                          <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-600">
                            Range: {item.field.min} – {item.field.max}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleInsert(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Insert Question
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
