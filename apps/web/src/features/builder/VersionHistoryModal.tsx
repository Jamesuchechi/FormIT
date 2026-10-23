import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  Clock,
  Eye,
  FileText,
  History,
  Layers,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormSchema } from "@formit/schema";
import {
  createVersionSnapshot,
  getFormVersionHistory,
  restoreFormVersion,
  type FormVersionHistoryItem,
} from "./versionsApi.ts";
import type { BuilderActions, BuilderState } from "./types.ts";

interface VersionHistoryModalProps {
  state: BuilderState;
  actions: BuilderActions;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistoryModal({
  state,
  actions,
  isOpen,
  onClose,
}: VersionHistoryModalProps) {
  const queryClient = useQueryClient();
  const { form, schema, isReadOnly } = state;

  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Query version history
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["form-versions-history", form.id],
    queryFn: () => getFormVersionHistory(form.id),
    enabled: isOpen,
  });

  // Default selected version to newest/current version when loaded
  useEffect(() => {
    if (versions.length > 0 && selectedVersionNum === null) {
      setSelectedVersionNum(versions[0]?.version ?? null);
    }
  }, [versions, selectedVersionNum]);

  const selectedVersion = versions.find((v) => v.version === selectedVersionNum) || versions[0];

  // Snapshot mutation
  const snapshotMutation = useMutation({
    mutationFn: (label?: string) => createVersionSnapshot(form.id, label),
    onSuccess: (newVersion) => {
      setSnapshotLabel("");
      setSnapshotSuccess(true);
      setErrorMessage(null);
      setSelectedVersionNum(newVersion);
      setTimeout(() => setSnapshotSuccess(false), 3000);
      void queryClient.invalidateQueries({ queryKey: ["form-versions-history", form.id] });
      void queryClient.invalidateQueries({ queryKey: ["owner-form", form.id] });
    },
    onError: (err: unknown) => {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create version snapshot.");
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (version: number) => restoreFormVersion(form.id, version),
    onSuccess: (restoredSchema: FormSchema) => {
      actions.restoreSchema(restoredSchema);
      setRestoreSuccess(`Successfully restored version ${selectedVersion?.version}.`);
      setConfirmRestore(false);
      setErrorMessage(null);
      setTimeout(() => setRestoreSuccess(null), 4000);
      void queryClient.invalidateQueries({ queryKey: ["form-versions-history", form.id] });
      void queryClient.invalidateQueries({ queryKey: ["owner-form", form.id] });
    },
    onError: (err: unknown) => {
      setErrorMessage(err instanceof Error ? err.message : "Failed to restore version.");
    },
  });

  function handleCreateSnapshot(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly || snapshotMutation.isPending) return;
    snapshotMutation.mutate(snapshotLabel.trim() || undefined);
  }

  function handleRestoreClick() {
    if (!selectedVersion || isReadOnly || restoreMutation.isPending) return;
    if (!confirmRestore) {
      setConfirmRestore(true);
      return;
    }
    restoreMutation.mutate(selectedVersion.version);
  }

  function formatDate(isoString: string): string {
    try {
      const d = new Date(isoString);
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  }

  function countQuestions(s: FormSchema): number {
    return s.sections?.reduce((sum, sec) => sum + (sec.fields?.length || 0), 0) || 0;
  }

  if (!isOpen) return null;

  const isCurrentVersion = selectedVersion?.version === form.schemaVersion;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-neutral-200 bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-neutral-50/60">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 flex-shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Version History</h2>
              <p className="text-xs text-neutral-500">
                Track checkpoints and restore prior versions of your form.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Snapshot Creation Toolbar */}
        {!isReadOnly && (
          <form
            onSubmit={handleCreateSnapshot}
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-neutral-100 bg-white"
          >
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <input
                type="text"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="Checkpoint label (optional, e.g. Pre-launch review)"
                className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={snapshotMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {snapshotMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5" />
              )}
              <span>Create Checkpoint</span>
            </button>
          </form>
        )}

        {/* Feedback Alerts */}
        {snapshotSuccess && (
          <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>New version snapshot created successfully.</span>
          </div>
        )}
        {restoreSuccess && (
          <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>{restoreSuccess}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
            <AlertCircle className="h-3.5 w-3.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[400px]">
          {/* Left Column: Version History List */}
          <div className="md:col-span-5 border-r border-neutral-100 overflow-y-auto p-4 space-y-2 bg-neutral-50/40">
            <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              <span>Versions</span>
              <span>{versions.length} total</span>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs">Loading version history...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Clock className="h-8 w-8 text-neutral-300 mb-2" />
                <p className="text-xs font-medium text-neutral-700">No versions saved yet</p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Create a checkpoint above or save form changes to record history.
                </p>
              </div>
            ) : (
              versions.map((ver: FormVersionHistoryItem) => {
                const isSelected = selectedVersion?.version === ver.version;
                const isCurrent = form.schemaVersion === ver.version;
                const qCount = countQuestions(ver.schema);

                return (
                  <button
                    key={ver.version}
                    type="button"
                    onClick={() => {
                      setSelectedVersionNum(ver.version);
                      setConfirmRestore(false);
                    }}
                    className={`w-full text-left rounded-xl p-3 transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/20"
                        : "bg-white border-neutral-200/80 hover:border-neutral-300 hover:shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center justify-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                          v{ver.version}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 whitespace-nowrap">
                        {formatDate(ver.createdAt)}
                      </span>
                    </div>

                    {ver.label && (
                      <p className="mt-1.5 text-xs font-medium text-neutral-800 truncate">
                        {ver.label}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-neutral-400" />
                        {qCount} {qCount === 1 ? "question" : "questions"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-neutral-400" />
                        {ver.schema.sections?.length || 0}{" "}
                        {ver.schema.sections?.length === 1 ? "section" : "sections"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Version Preview & Restore Button */}
          <div className="md:col-span-7 flex flex-col overflow-hidden bg-white">
            {selectedVersion ? (
              <>
                {/* Selected Version Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-6 py-4 bg-neutral-50/20">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-neutral-900">
                        Version {selectedVersion.version}
                      </h3>
                      {isCurrentVersion && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Created on {formatDate(selectedVersion.createdAt)}
                      {selectedVersion.label ? ` · ${selectedVersion.label}` : ""}
                    </p>
                  </div>

                  {/* Restore Action */}
                  {!isReadOnly && (
                    <div>
                      {isCurrentVersion ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500">
                          <Check className="h-3.5 w-3.5" />
                          Already current version
                        </span>
                      ) : confirmRestore ? (
                        <div className="flex items-center gap-2 animate-in fade-in duration-100">
                          <button
                            type="button"
                            onClick={() => setConfirmRestore(false)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleRestoreClick}
                            disabled={restoreMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 shadow-sm cursor-pointer"
                          >
                            {restoreMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            <span>Confirm Restore</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRestoreClick}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition-colors cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Restore this version</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Form Title & Description in this version */}
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
                    <h4 className="text-base font-semibold text-neutral-900">
                      {selectedVersion.schema.title || "Untitled form"}
                    </h4>
                    {selectedVersion.schema.description ? (
                      <p className="mt-1 text-xs text-neutral-600 whitespace-pre-wrap">
                        {selectedVersion.schema.description}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs italic text-neutral-400">No description</p>
                    )}
                  </div>

                  {/* Sections Breakdown */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      Schema Structure ({selectedVersion.schema.sections?.length || 0} sections)
                    </h5>

                    {selectedVersion.schema.sections?.map((sec, idx) => (
                      <div
                        key={sec.id || idx}
                        className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-neutral-800">
                            {sec.title || `Section ${idx + 1}`}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {sec.fields?.map((f, fIdx) => (
                            <div
                              key={f.id || fIdx}
                              className="flex items-center justify-between rounded-lg bg-neutral-50/80 px-3 py-2 text-xs"
                            >
                              <div className="min-w-0 pr-3">
                                <span className="font-medium text-neutral-800 truncate block">
                                  {f.label || "Untitled question"}
                                </span>
                                {f.helpText && (
                                  <span className="text-[11px] text-neutral-400 truncate block">
                                    {f.helpText}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {f.required && (
                                  <span className="text-[10px] text-red-500 font-semibold">
                                    Required
                                  </span>
                                )}
                                <span className="rounded bg-white border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                                  {f.type.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-neutral-400">
                <Eye className="h-8 w-8 mb-2 text-neutral-300" />
                <p className="text-xs">Select a version from the left to preview its schema.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
