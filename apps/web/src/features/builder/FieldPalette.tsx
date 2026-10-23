import { FIELD_TYPES, type Field, type FieldType } from "@formit/schema";
import { useQuery } from "@tanstack/react-query";
import {
  AlignLeft,
  ArrowUpDown,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  Eye,
  FileUp,
  FolderPlus,
  Grid,
  Layers,
  PenTool,
  Plus,
  Search,
  Sliders,
  Sparkles,
  Type,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { QuestionBankModal } from "../questionBank/QuestionBankModal.tsx";
import { getSavedQuestions, type FieldTemplate } from "../questionBank/questionBankApi.ts";
import { QUESTION_PRESETS, type QuestionPreset } from "../questionBank/questionPresets.ts";
import type { BuilderActions, BuilderState } from "./types.ts";

interface FieldPaletteProps {
  state: BuilderState;
  actions: BuilderActions;
}

const FIELD_ICONS: Record<FieldType, ReactNode> = {
  short_text: <Type className="h-4 w-4 text-blue-500" />,
  long_text: <AlignLeft className="h-4 w-4 text-indigo-500" />,
  multiple_choice: <CircleDot className="h-4 w-4 text-emerald-500" />,
  checkboxes: <CheckSquare className="h-4 w-4 text-teal-500" />,
  dropdown: <ChevronDown className="h-4 w-4 text-amber-500" />,
  linear_scale: <Sliders className="h-4 w-4 text-purple-500" />,
  date: <Calendar className="h-4 w-4 text-pink-500" />,
  file_upload: <FileUp className="h-4 w-4 text-rose-500" />,
  matrix: <Grid className="h-4 w-4 text-cyan-500" />,
  ranking: <ArrowUpDown className="h-4 w-4 text-orange-500" />,
  signature: <PenTool className="h-4 w-4 text-violet-500" />,
};

const FIELD_TITLES: Record<FieldType, { name: string; desc: string }> = {
  short_text: { name: "Short text", desc: "Single line input" },
  long_text: { name: "Paragraph", desc: "Multi-line text area" },
  multiple_choice: { name: "Multiple choice", desc: "Tactile single-select cards" },
  checkboxes: { name: "Checkboxes", desc: "Multi-select option cards" },
  dropdown: { name: "Dropdown", desc: "Compact selectable list" },
  linear_scale: { name: "Rating scale", desc: "1 to 5 or custom score" },
  date: { name: "Date", desc: "Calendar date picker" },
  file_upload: { name: "File upload", desc: "Documents, images, resumes" },
  matrix: { name: "Grid / Matrix", desc: "Rows and columns table" },
  ranking: { name: "Ranking", desc: "Drag to order items" },
  signature: { name: "Signature", desc: "Digital canvas signature pad" },
};

export function FieldPalette({ state, actions }: FieldPaletteProps) {
  const { schema, selectedSectionId, selectedFieldId } = state;
  const [tab, setTab] = useState<"fields" | "bank">("fields");
  const [bankSearch, setBankSearch] = useState("");
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const currentSectionId = selectedSectionId || schema.sections[0]?.id;

  const { data: savedQuestions = [] } = useQuery({
    queryKey: ["saved-questions"],
    queryFn: getSavedQuestions,
  });

  const combinedBankItems = useMemo(() => {
    const customList = savedQuestions.map((sq) => ({
      id: sq.id,
      title: sq.title,
      category: sq.category,
      field: sq.fieldDefinition,
      isPreset: false,
    }));

    const presetList = QUESTION_PRESETS.map((qp: QuestionPreset) => ({
      id: qp.id,
      title: qp.title,
      category: qp.category,
      field: qp.field,
      isPreset: true,
    }));

    return [...customList, ...presetList];
  }, [savedQuestions]);

  const filteredBankItems = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return combinedBankItems;
    return combinedBankItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.field.type.toLowerCase().includes(q),
    );
  }, [combinedBankItems, bankSearch]);

  function handleAddField(type: FieldType) {
    if (!currentSectionId || state.isReadOnly) return;
    actions.addField(currentSectionId, type, selectedFieldId || undefined);
  }

  function handleInsertBankQuestion(template: FieldTemplate) {
    if (!currentSectionId || state.isReadOnly) return;
    actions.insertQuestion(currentSectionId, template, selectedFieldId || undefined);
  }

  return (
    <aside className="w-full lg:w-72 lg:flex-shrink-0 border-r border-neutral-200 bg-white flex flex-col h-full lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16 overflow-y-auto">
      {state.isReadOnly && (
        <div className="bg-amber-50/90 border-b border-amber-200 px-3.5 py-2 text-xs text-amber-800 flex items-center gap-1.5 flex-shrink-0">
          <Eye className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
          <span className="font-medium">Viewer mode · Read-only</span>
        </div>
      )}
      {/* Top Segmented Tabs: Elements vs Question Bank */}
      <div className="p-3 border-b border-neutral-200 bg-neutral-50/70">
        <div className="flex rounded-lg bg-neutral-200/70 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab("fields")}
            className={`flex-1 rounded-md py-1.5 transition-all text-center cursor-pointer ${
              tab === "fields"
                ? "bg-white text-neutral-900 font-semibold shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Elements
          </button>
          <button
            type="button"
            onClick={() => setTab("bank")}
            className={`flex-1 rounded-md py-1.5 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === "bank"
                ? "bg-white text-indigo-600 font-semibold shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Bank ({combinedBankItems.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Standard Elements */}
      {tab === "fields" && (
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Add Questions
            </h2>
            <span className="text-[10px] text-neutral-400">Click to insert</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {FIELD_TYPES.map((type) => {
              const meta = FIELD_TITLES[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAddField(type)}
                  className="group flex items-center gap-3 rounded-lg border border-neutral-200/80 bg-neutral-50/50 p-2.5 text-left transition-all hover:border-indigo-300 hover:bg-white hover:shadow-sm cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white border border-neutral-200/60 shadow-xs group-hover:scale-105 transition-transform">
                    {FIELD_ICONS[type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-neutral-900 group-hover:text-indigo-600 transition-colors">
                      {meta.name}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">{meta.desc}</div>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Question Bank */}
      {tab === "bank" && (
        <div className="p-4 border-b border-neutral-200 space-y-3">
          <button
            type="button"
            onClick={() => setIsBankModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200/80 p-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors shadow-2xs cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Browse Full Library</span>
          </button>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              placeholder="Search question bank…"
              className="w-full rounded-lg border border-neutral-200 pl-8 pr-3 py-1.5 text-xs text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
            {filteredBankItems.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-400">No questions matched</p>
            ) : (
              filteredBankItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleInsertBankQuestion(item.field)}
                  className="group w-full flex items-center gap-2.5 rounded-lg border border-neutral-200/70 bg-neutral-50/40 p-2 text-left hover:border-indigo-300 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-white border border-neutral-200/80 flex-shrink-0">
                    {FIELD_ICONS[item.field.type as FieldType] || (
                      <Type className="h-3.5 w-3.5 text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-neutral-800 group-hover:text-indigo-600 truncate transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">
                      {item.isPreset ? item.category : "Custom"} • {item.field.type.replace(/_/g, " ")}
                    </div>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sections & Outline Tree */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Form Structure
          </h2>
          <button
            type="button"
            onClick={actions.addSection}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Add Section
          </button>
        </div>

        <div className="space-y-3">
          {schema.sections.map((section, secIdx) => {
            const isSecSelected = section.id === selectedSectionId;
            return (
              <div
                key={section.id}
                className={`rounded-lg border transition-all ${
                  isSecSelected
                    ? "border-indigo-300 bg-indigo-50/20 shadow-xs"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => actions.selectSection(section.id)}
                  className="w-full flex items-center justify-between p-2.5 text-left text-xs font-medium text-neutral-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Layers className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="truncate">{section.title || `Section ${secIdx + 1}`}</span>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                    {section.fields.length}
                  </span>
                </button>

                {section.fields.length > 0 && (
                  <div className="px-2 pb-2 space-y-1">
                    {section.fields.map((f) => {
                      const isFieldSelected = f.id === selectedFieldId;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => actions.selectField(f.id, section.id)}
                          className={`w-full flex items-center gap-2 rounded px-2 py-1 text-left text-[11px] truncate transition-colors cursor-pointer ${
                            isFieldSelected
                              ? "bg-indigo-600 text-white font-medium"
                              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                          }`}
                        >
                          <span className="flex-shrink-0">{FIELD_ICONS[f.type]}</span>
                          <span className="truncate">{f.label || "Untitled question"}</span>
                          {f.required && (
                            <span className={isFieldSelected ? "text-indigo-200" : "text-red-500"}>
                              *
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        onInsertQuestion={handleInsertBankQuestion}
      />
    </aside>
  );
}
