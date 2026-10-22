import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FIELD_TYPES, newId, type Field, type FieldOption, type FieldType } from "@formit/schema";
import { Calendar, Copy, GripVertical, Plus, Trash2, UploadCloud, X, Zap } from "lucide-react";
import type { BuilderActions } from "./types.ts";

interface BuilderFieldCardProps {
  field: Field;
  sectionId: string;
  isSelected: boolean;
  onSelect: () => void;
  actions: BuilderActions;
}

export function BuilderFieldCard({
  field,
  sectionId,
  isSelected,
  onSelect,
  actions,
}: BuilderFieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function handleAddOption() {
    if (
      field.type !== "multiple_choice" &&
      field.type !== "checkboxes" &&
      field.type !== "dropdown"
    ) {
      return;
    }
    const currentOptions = (field as { options: FieldOption[] }).options || [];
    const newOption: FieldOption = {
      id: newId("o"),
      label: `Option ${currentOptions.length + 1}`,
    };
    actions.updateField(sectionId, field.id, {
      options: [...currentOptions, newOption],
    } as unknown as Partial<Field>);
  }

  function handleUpdateOption(optionId: string, label: string) {
    if (
      field.type !== "multiple_choice" &&
      field.type !== "checkboxes" &&
      field.type !== "dropdown"
    ) {
      return;
    }
    const currentOptions = (field as { options: FieldOption[] }).options || [];
    const nextOptions = currentOptions.map((opt) =>
      opt.id === optionId ? { ...opt, label } : opt,
    );
    actions.updateField(sectionId, field.id, { options: nextOptions } as unknown as Partial<Field>);
  }

  function handleDeleteOption(optionId: string) {
    if (
      field.type !== "multiple_choice" &&
      field.type !== "checkboxes" &&
      field.type !== "dropdown"
    ) {
      return;
    }
    const currentOptions = (field as { options: FieldOption[] }).options || [];
    if (currentOptions.length <= 1) return; // Keep at least one option
    const nextOptions = currentOptions.filter((opt) => opt.id !== optionId);
    actions.updateField(sectionId, field.id, { options: nextOptions } as unknown as Partial<Field>);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group relative rounded-xl border bg-white p-5 transition-all shadow-xs ${
        isDragging
          ? "opacity-50 border-indigo-400 shadow-lg z-20"
          : isSelected
            ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
            : "border-neutral-200 hover:border-neutral-300 hover:shadow-sm"
      }`}
    >
      {/* Top Header Row: Drag Handle + Inline Label + Quick Actions */}
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="mt-1 cursor-grab rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Question Header & Inline Inputs */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={field.label}
              onChange={(e) => actions.updateField(sectionId, field.id, { label: e.target.value })}
              placeholder="Question title"
              className="w-full text-base font-semibold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-indigo-500 outline-none pb-0.5 transition-colors"
            />
            {field.required && (
              <span className="text-red-500 font-bold text-sm" title="Required">
                *
              </span>
            )}
          </div>

          <input
            type="text"
            value={field.helpText || ""}
            onChange={(e) => actions.updateField(sectionId, field.id, { helpText: e.target.value })}
            placeholder="Add description or instructions (optional)"
            className="w-full text-xs text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-indigo-500 outline-none pb-0.5 transition-colors"
          />
        </div>

        {/* Top-Right Field Controls */}
        <div className="flex items-center gap-1.5">
          {/* Type Selector Dropdown */}
          <select
            value={field.type}
            onChange={(e) =>
              actions.changeFieldType(sectionId, field.id, e.target.value as FieldType)
            }
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Duplicate Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              actions.duplicateField(sectionId, field.id);
            }}
            title="Duplicate question"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              actions.deleteField(sectionId, field.id);
            }}
            title="Delete question"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Field Input Representation */}
      <div className="mt-4 pl-7">
        {/* Short Text */}
        {field.type === "short_text" && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs text-neutral-400 pointer-events-none">
            Short text answer...
          </div>
        )}

        {/* Long Text */}
        {field.type === "long_text" && (
          <div className="h-20 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 text-xs text-neutral-400 pointer-events-none">
            Paragraph / long response answer...
          </div>
        )}

        {/* Multiple Choice (Tactile Cards) */}
        {field.type === "multiple_choice" && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {field.options.map((option, idx) => (
                <div
                  key={option.id}
                  className="group/opt flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2 hover:border-neutral-300 hover:bg-white transition-all shadow-2xs"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-neutral-200 text-[10px] font-bold text-neutral-700">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => handleUpdateOption(option.id, e.target.value)}
                    className="flex-1 bg-transparent text-xs text-neutral-900 outline-none"
                    placeholder={`Option ${idx + 1}`}
                  />
                  {field.options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteOption(option.id)}
                      className="text-neutral-400 opacity-0 group-hover/opt:opacity-100 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddOption}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 pt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Option
            </button>
          </div>
        )}

        {/* Checkboxes */}
        {field.type === "checkboxes" && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {field.options.map((option, idx) => (
                <div
                  key={option.id}
                  className="group/opt flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2 hover:border-neutral-300 hover:bg-white transition-all shadow-2xs"
                >
                  <div className="h-4 w-4 rounded border border-neutral-300 bg-white" />
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => handleUpdateOption(option.id, e.target.value)}
                    className="flex-1 bg-transparent text-xs text-neutral-900 outline-none"
                    placeholder={`Option ${idx + 1}`}
                  />
                  {field.options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteOption(option.id)}
                      className="text-neutral-400 opacity-0 group-hover/opt:opacity-100 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddOption}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 pt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Option
            </button>
          </div>
        )}

        {/* Dropdown */}
        {field.type === "dropdown" && (
          <div className="space-y-2">
            <div className="space-y-1.5">
              {field.options.map((option, idx) => (
                <div
                  key={option.id}
                  className="group/opt flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs"
                >
                  <span className="text-[10px] text-neutral-400">{idx + 1}.</span>
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => handleUpdateOption(option.id, e.target.value)}
                    className="flex-1 bg-transparent text-xs text-neutral-900 outline-none"
                    placeholder={`Option ${idx + 1}`}
                  />
                  {field.options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteOption(option.id)}
                      className="text-neutral-400 opacity-0 group-hover/opt:opacity-100 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddOption}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 pt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Option
            </button>
          </div>
        )}

        {/* Linear Scale */}
        {field.type === "linear_scale" && (
          <div className="flex flex-wrap items-center gap-2 py-1">
            {field.labels?.min && (
              <span className="text-xs text-neutral-500 mr-1">{field.labels.min}</span>
            )}
            {Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i).map(
              (val) => (
                <div
                  key={val}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700"
                >
                  {val}
                </div>
              ),
            )}
            {field.labels?.max && (
              <span className="text-xs text-neutral-500 ml-1">{field.labels.max}</span>
            )}
          </div>
        )}

        {/* Date Field */}
        {field.type === "date" && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs text-neutral-400">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <span>YYYY-MM-DD</span>
          </div>
        )}

        {/* File Upload */}
        {field.type === "file_upload" && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-center text-xs text-neutral-500">
            <UploadCloud className="h-6 w-6 text-neutral-400 mb-1" />
            <span>Drop file here or click to browse</span>
            <span className="text-[10px] text-neutral-400 mt-0.5">
              Up to {field.validation.maxSizeMb} MB
            </span>
          </div>
        )}

        {/* Conditional Logic Badge */}
        {field.visibleIf && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
            <Zap className="h-3 w-3 text-amber-500" />
            Conditional question
          </div>
        )}
      </div>
    </div>
  );
}
