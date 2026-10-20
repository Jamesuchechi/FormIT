import { FIELD_TYPES, type FieldType } from "@formit/schema";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  FileUp,
  FolderPlus,
  Layers,
  Plus,
  Sliders,
  Type,
} from "lucide-react";
import type { ReactNode } from "react";
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
};

export function FieldPalette({ state, actions }: FieldPaletteProps) {
  const { schema, selectedSectionId, selectedFieldId } = state;

  const currentSectionId = selectedSectionId || schema.sections[0]?.id;

  function handleAddField(type: FieldType) {
    if (!currentSectionId) return;
    actions.addField(currentSectionId, type, selectedFieldId || undefined);
  }

  return (
    <aside className="w-72 flex-shrink-0 border-r border-neutral-200 bg-white flex flex-col h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      {/* Field Elements Palette */}
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
                className="group flex items-center gap-3 rounded-lg border border-neutral-200/80 bg-neutral-50/50 p-2.5 text-left transition-all hover:border-indigo-300 hover:bg-white hover:shadow-sm"
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

      {/* Sections & Outline Tree */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Form Structure
          </h2>
          <button
            type="button"
            onClick={actions.addSection}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
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
                  className="w-full flex items-center justify-between p-2.5 text-left text-xs font-medium text-neutral-800"
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
                          className={`w-full flex items-center gap-2 rounded px-2 py-1 text-left text-[11px] truncate transition-colors ${
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
    </aside>
  );
}
