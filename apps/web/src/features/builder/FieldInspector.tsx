import { allFields, type Field, type Rule, type RuleOp } from "@formit/schema";
import { AlertCircle, BookmarkPlus, Sliders, Trash2, X, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { SaveQuestionModal } from "../questionBank/SaveQuestionModal.tsx";
import type { BuilderActions, BuilderState } from "./types.ts";

interface FieldInspectorProps {
  state: BuilderState;
  actions: BuilderActions;
}

export function FieldInspector({ state, actions }: FieldInspectorProps) {
  const { schema, selectedFieldId } = state;
  const [tab, setTab] = useState<"general" | "logic">("general");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

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

  if (!field || !sectionId) {
    return (
      <aside className="w-80 flex-shrink-0 border-l border-neutral-200 bg-white p-6 h-[calc(100vh-4rem)] sticky top-16 flex flex-col items-center justify-center text-center text-neutral-400">
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
    <aside className="w-80 flex-shrink-0 border-l border-neutral-200 bg-white flex flex-col h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
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
    </aside>
  );
}
