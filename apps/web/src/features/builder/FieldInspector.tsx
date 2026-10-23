import { allFields, type Field, type Rule, type RuleOp } from "@formit/schema";
import {
  AlertCircle,
  BookmarkPlus,
  Eye,
  FileSpreadsheet,
  Image as ImageIcon,
  Shuffle,
  Sliders,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SaveQuestionModal } from "../questionBank/SaveQuestionModal.tsx";
import { ImportOptionsModal } from "./ImportOptionsModal.tsx";
import type { BuilderActions, BuilderState } from "./types.ts";

interface FieldInspectorProps {
  state: BuilderState;
  actions: BuilderActions;
}

export function FieldInspector({ state, actions }: FieldInspectorProps) {
  const { schema, selectedFieldId } = state;
  const [tab, setTab] = useState<"general" | "logic">("general");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [imageInput, setImageInput] = useState("");

  // Find currently selected field and its section
  const { field, sectionId } = useMemo(() => {
    if (!selectedFieldId) return { field: null, sectionId: null };
    for (const sec of schema.sections) {
      const f = sec.fields.find((fieldItem) => fieldItem.id === selectedFieldId);
      if (f) return { field: f, sectionId: sec.id };
    }
    return { field: null, sectionId: null };
  }, [schema, selectedFieldId]);

  // Candidates for conditional logic: must strictly precede the current field in form flow
  const precedingFields = useMemo(() => {
    if (!selectedFieldId) return [];
    const candidates: Field[] = [];
    for (const f of allFields(schema)) {
      if (f.id === selectedFieldId) break;
      candidates.push(f);
    }
    return candidates;
  }, [schema, selectedFieldId]);

  useEffect(() => {
    setImageInput(field?.imageUrl || "");
  }, [field?.id, field?.imageUrl]);

  function handleImageFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !sectionId || !field) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        actions.updateField(sectionId, field.id, {
          imageUrl: dataUrl,
        } as unknown as Partial<Field>);
      }
    };
    reader.readAsDataURL(file);
  }

  if (!field || !sectionId) {
    return (
      <aside className="w-full lg:w-80 lg:flex-shrink-0 border-l border-neutral-200 bg-white p-6 h-full lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16 flex flex-col items-center justify-center text-center text-neutral-400">
        <Sliders className="h-8 w-8 text-neutral-300 mb-2" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Question Inspector
        </h3>
        <p className="mt-1 text-xs text-neutral-400 max-w-[200px]">
          Click any question on the canvas to configure its validations and conditional logic.
        </p>
      </aside>
    );
  }

  function handleValidationChange(key: string, value: unknown) {
    if (!field || !sectionId) return;
    const currentValidation =
      "validation" in field && typeof field.validation === "object" && field.validation !== null
        ? (field.validation as Record<string, unknown>)
        : {};
    const nextValidation = { ...currentValidation, [key]: value };
    // Clear empty or undefined
    if (value === "" || value === undefined) {
      delete nextValidation[key];
    }
    actions.updateField(sectionId, field.id, {
      validation: nextValidation,
    } as unknown as Partial<Field>);
  }

  // Simple rule helper for visibleIf: { field, op, value }
  const currentRule = field.visibleIf && "field" in field.visibleIf ? field.visibleIf : null;

  function handleRuleChange(updates: Partial<{ field: string; op: RuleOp; value: unknown }>) {
    if (!field || !sectionId) return;
    const defaultCandidate = precedingFields[0]?.id || "";
    const baseRule: { field: string; op: RuleOp; value?: unknown } = currentRule || {
      field: defaultCandidate,
      op: "eq",
      value: "",
    };

    const newRule: Rule = {
      ...baseRule,
      ...updates,
    };
    actions.updateFieldRule(sectionId, field.id, newRule);
  }

  function handleClearRule() {
    if (!field || !sectionId) return;
    actions.updateFieldRule(sectionId, field.id, undefined);
  }

  const selectedTargetField = precedingFields.find((f) => f.id === currentRule?.field);

  return (
    <aside className="w-full lg:w-80 lg:flex-shrink-0 border-l border-neutral-200 bg-white flex flex-col h-full lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16 overflow-y-auto">
      {state.isReadOnly && (
        <div className="bg-amber-50/90 border-b border-amber-200 px-3.5 py-2 text-xs text-amber-800 flex items-center gap-1.5 flex-shrink-0">
          <Eye className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
          <span className="font-medium">Viewer mode · Read-only</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
            Properties
          </span>
          <span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 rounded px-1.5 py-0.5">
            {field.id}
          </span>
        </div>
        <button
          type="button"
          onClick={() => actions.selectField(null)}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          title="Close inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-neutral-50 p-1">
        <button
          type="button"
          onClick={() => setTab("general")}
          className={`flex-1 rounded py-1.5 text-xs font-medium transition-all ${
            tab === "general"
              ? "bg-white text-neutral-900 shadow-xs"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          General & Rules
        </button>
        <button
          type="button"
          onClick={() => setTab("logic")}
          className={`flex-1 rounded py-1.5 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            tab === "logic"
              ? "bg-white text-neutral-900 shadow-xs"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Zap className="h-3 w-3 text-amber-500" />
          Logic {field.visibleIf && "•"}
        </button>
      </div>

      <div className="flex-1 p-4 space-y-5 overflow-y-auto">
        {tab === "general" ? (
          <>
            {/* Required Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 bg-neutral-50/50">
              <div>
                <label
                  htmlFor="field-required-toggle"
                  className="text-xs font-medium text-neutral-900 block cursor-pointer"
                >
                  Required field
                </label>
                <span className="text-[10px] text-neutral-500">
                  Respondent must answer to proceed
                </span>
              </div>
              <input
                id="field-required-toggle"
                type="checkbox"
                checked={field.required}
                onChange={(e) =>
                  actions.updateField(sectionId, field.id, { required: e.target.checked })
                }
                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Question Description Image Section */}
            <div className="space-y-3 rounded-lg border border-neutral-200 p-3 bg-neutral-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-indigo-600" />
                  <label className="text-xs font-semibold text-neutral-900 block">
                    Question Image
                  </label>
                </div>
                {field.imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageInput("");
                      actions.updateField(sectionId, field.id, {
                        imageUrl: undefined,
                        imageAlt: undefined,
                      } as unknown as Partial<Field>);
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[10px] text-neutral-500">
                Attach an illustrative diagram, photo, or screenshot to this question.
              </p>

              {field.imageUrl ? (
                <div className="space-y-2 pt-1">
                  <div className="relative rounded-lg border border-neutral-200 overflow-hidden bg-white max-h-40 flex items-center justify-center p-1">
                    <img
                      src={field.imageUrl}
                      alt={field.imageAlt || "Question image"}
                      className="max-h-36 w-full object-contain rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-600 block mb-1">
                      Alt text / Description
                    </label>
                    <input
                      type="text"
                      value={field.imageAlt ?? ""}
                      onChange={(e) =>
                        actions.updateField(sectionId, field.id, {
                          imageAlt: e.target.value || undefined,
                        } as unknown as Partial<Field>)
                      }
                      placeholder="e.g. Diagram of customer journey"
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={imageInput}
                      onChange={(e) => setImageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (imageInput.trim()) {
                            actions.updateField(sectionId, field.id, {
                              imageUrl: imageInput.trim(),
                            } as unknown as Partial<Field>);
                          }
                        }
                      }}
                      placeholder="Paste image URL (https://...)"
                      className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (imageInput.trim()) {
                          actions.updateField(sectionId, field.id, {
                            imageUrl: imageInput.trim(),
                          } as unknown as Partial<Field>);
                        }
                      }}
                      disabled={!imageInput.trim()}
                      className="rounded bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="flex items-center justify-center">
                    <label className="w-full flex items-center justify-center gap-1.5 rounded border border-dashed border-neutral-300 bg-white p-1.5 text-xs font-medium text-neutral-600 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer transition-colors">
                      <Upload className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Upload local image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Type-Specific Validations */}
            {field.type === "short_text" && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-neutral-700">Text Validation</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-neutral-600 block mb-1">
                      Min characters
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={field.validation.minLength ?? ""}
                      onChange={(e) =>
                        handleValidationChange(
                          "minLength",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-600 block mb-1">
                      Max characters
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={field.validation.maxLength ?? ""}
                      onChange={(e) =>
                        handleValidationChange(
                          "maxLength",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                      placeholder="1000"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-600 block mb-1">
                    Regex Pattern (Optional)
                  </label>
                  <input
                    type="text"
                    value={field.validation.pattern ?? ""}
                    onChange={(e) => handleValidationChange("pattern", e.target.value || undefined)}
                    className="w-full rounded border border-neutral-300 px-2 py-1 text-xs font-mono"
                    placeholder="^[a-zA-Z0-9]+$"
                  />
                </div>
              </div>
            )}

            {field.type === "long_text" && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-neutral-700">Paragraph Bounds</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-neutral-600 block mb-1">Min length</label>
                    <input
                      type="number"
                      min={0}
                      value={field.validation.minLength ?? ""}
                      onChange={(e) =>
                        handleValidationChange(
                          "minLength",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-600 block mb-1">Max length</label>
                    <input
                      type="number"
                      min={1}
                      value={field.validation.maxLength ?? ""}
                      onChange={(e) =>
                        handleValidationChange(
                          "maxLength",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                      placeholder="20000"
                    />
                  </div>
                </div>
              </div>
            )}

            {(field.type === "multiple_choice" ||
              field.type === "checkboxes" ||
              field.type === "dropdown") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-neutral-700">Options & Choices</h4>
                  <span className="text-[11px] font-medium text-neutral-500">
                    {field.options.length} {field.options.length === 1 ? "option" : "options"}
                  </span>
                </div>

                {/* Bulk Import / Paste Button */}
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white p-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-2xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                  Bulk Add / Import from CSV
                </button>

                {/* Allow Other Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 bg-neutral-50/50">
                  <div>
                    <label
                      htmlFor="field-other-toggle"
                      className="text-xs font-medium text-neutral-900 block cursor-pointer"
                    >
                      Allow "Other" choice
                    </label>
                    <span className="text-[10px] text-neutral-500">
                      Adds an "Other" option with text box
                    </span>
                  </div>
                  <input
                    id="field-other-toggle"
                    type="checkbox"
                    checked={!!field.allowOther}
                    onChange={(e) =>
                      actions.updateField(sectionId, field.id, {
                        allowOther: e.target.checked,
                      } as unknown as Partial<Field>)
                    }
                    className="rounded border-neutral-300 accent-indigo-600 size-4 cursor-pointer"
                  />
                </div>

                {/* Shuffle Options Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 bg-neutral-50/50">
                  <div>
                    <label
                      htmlFor="field-shuffle-toggle"
                      className="text-xs font-medium text-neutral-900 block cursor-pointer"
                    >
                      Shuffle choices
                    </label>
                    <span className="text-[10px] text-neutral-500">
                      Randomize option order for respondents
                    </span>
                  </div>
                  <input
                    id="field-shuffle-toggle"
                    type="checkbox"
                    checked={!!field.shuffleOptions}
                    onChange={(e) =>
                      actions.updateField(sectionId, field.id, {
                        shuffleOptions: e.target.checked,
                      } as unknown as Partial<Field>)
                    }
                    className="rounded border-neutral-300 accent-indigo-600 size-4 cursor-pointer"
                  />
                </div>

                {/* Checkbox limits */}
                {field.type === "checkboxes" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] text-neutral-600 block mb-1">
                        Min selections
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={field.validation.minSelected ?? ""}
                        onChange={(e) =>
                          handleValidationChange(
                            "minSelected",
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-600 block mb-1">
                        Max selections
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={field.validation.maxSelected ?? ""}
                        onChange={(e) =>
                          handleValidationChange(
                            "maxSelected",
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {field.type === "linear_scale" && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-neutral-700">Scale Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-neutral-600 block mb-1">Min Value</label>
                    <select
                      value={field.min}
                      onChange={(e) =>
                        actions.updateField(sectionId, field.id, { min: Number(e.target.value) })
                      }
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-600 block mb-1">Max Value</label>
                    <select
                      value={field.max}
                      onChange={(e) =>
                        actions.updateField(sectionId, field.id, { max: Number(e.target.value) })
                      }
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                    >
                      {[3, 4, 5, 7, 10].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-600 block mb-1">
                    Lowest Score Label
                  </label>
                  <input
                    type="text"
                    value={field.labels?.min ?? ""}
                    onChange={(e) =>
                      actions.updateField(sectionId, field.id, {
                        labels: { ...field.labels, min: e.target.value || undefined },
                      })
                    }
                    className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                    placeholder="e.g. Not satisfied"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-600 block mb-1">
                    Highest Score Label
                  </label>
                  <input
                    type="text"
                    value={field.labels?.max ?? ""}
                    onChange={(e) =>
                      actions.updateField(sectionId, field.id, {
                        labels: { ...field.labels, max: e.target.value || undefined },
                      })
                    }
                    className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                    placeholder="e.g. Extremely satisfied"
                  />
                </div>
              </div>
            )}

            {field.type === "file_upload" && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-neutral-700">Upload Limits</h4>
                <div>
                  <label className="text-[11px] text-neutral-600 block mb-1">
                    Max File Size (MB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={field.validation.maxSizeMb}
                    onChange={(e) =>
                      handleValidationChange("maxSizeMb", Number(e.target.value) || 10)
                    }
                    className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-600 block mb-1">
                    Allowed File Types
                  </label>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { label: "PDF Documents", mime: "application/pdf" },
                      { label: "Images (JPG, PNG, GIF)", mime: "image/*" },
                      { label: "Audio Files", mime: "audio/*" },
                      { label: "Video Files", mime: "video/*" },
                    ].map((opt) => {
                      const currentAccept = field.validation.accept || [];
                      const isChecked = currentAccept.includes(opt.mime);
                      return (
                        <label key={opt.mime} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...currentAccept, opt.mime]
                                : currentAccept.filter((m) => m !== opt.mime);
                              handleValidationChange("accept", next.length > 0 ? next : undefined);
                            }}
                            className="rounded border-neutral-300 text-indigo-600"
                          />
                          <span className="text-neutral-700">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <BookmarkPlus className="h-4 w-4 text-indigo-500" />
                Save to Question Bank
              </button>
            </div>
          </>
        ) : (
          /* Conditional Logic Tab */
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-neutral-900">Conditional Visibility</h4>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Show or hide this question based on earlier answers in the form.
              </p>
            </div>

            {precedingFields.length === 0 ? (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center">
                <AlertCircle className="mx-auto h-5 w-5 text-neutral-400 mb-1" />
                <p className="text-xs text-neutral-600">
                  This is the first question in the form. Conditional logic requires at least one
                  earlier question to base rules on.
                </p>
              </div>
            ) : !field.visibleIf ? (
              <button
                type="button"
                onClick={() => handleRuleChange({})}
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 p-4 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                <Zap className="h-4 w-4" />
                Add Show/Hide Rule
              </button>
            ) : (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-900">Show this if</span>
                  <button
                    type="button"
                    onClick={handleClearRule}
                    title="Remove rule"
                    className="text-neutral-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Target Field Selector */}
                <div>
                  <label className="text-[11px] text-neutral-600 block mb-1">Question</label>
                  <select
                    value={currentRule?.field}
                    onChange={(e) => handleRuleChange({ field: e.target.value })}
                    className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs"
                  >
                    {precedingFields.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.label || "Untitled question"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator Selector */}
                <div>
                  <label className="text-[11px] text-neutral-600 block mb-1">Operator</label>
                  <select
                    value={currentRule?.op || "eq"}
                    onChange={(e) => handleRuleChange({ op: e.target.value as RuleOp })}
                    className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="eq">is equal to</option>
                    <option value="neq">is not equal to</option>
                    <option value="contains">contains</option>
                    <option value="answered">is answered</option>
                    <option value="unanswered">is unanswered</option>
                  </select>
                </div>

                {/* Target Value Input */}
                {currentRule?.op !== "answered" && currentRule?.op !== "unanswered" && (
                  <div>
                    <label className="text-[11px] text-neutral-600 block mb-1">Value</label>
                    {selectedTargetField &&
                    "options" in selectedTargetField &&
                    Array.isArray(selectedTargetField.options) ? (
                      <select
                        value={String(currentRule?.value ?? "")}
                        onChange={(e) => handleRuleChange({ value: e.target.value })}
                        className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="">Select option...</option>
                        {selectedTargetField.options.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={String(currentRule?.value ?? "")}
                        onChange={(e) => handleRuleChange({ value: e.target.value })}
                        className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs"
                        placeholder="Target value"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <SaveQuestionModal
        isOpen={isSaveModalOpen}
        field={field}
        onClose={() => setIsSaveModalOpen(false)}
      />

      {field && "options" in field && (
        <ImportOptionsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          currentOptions={field.options}
          onImport={(newOptions) =>
            actions.updateField(sectionId, field.id, {
              options: newOptions,
            } as unknown as Partial<Field>)
          }
        />
      )}
    </aside>
  );
}
