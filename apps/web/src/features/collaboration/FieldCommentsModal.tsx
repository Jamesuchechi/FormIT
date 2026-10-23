import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  CornerDownLeft,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  addFieldComment,
  deleteFieldComment,
  getFormComments,
  updateFieldCommentStatus,
  type FieldComment,
} from "./commentsApi.ts";

interface FieldCommentsModalProps {
  formId: string;
  fieldId: string;
  fieldLabel: string;
  isOpen: boolean;
  onClose: () => void;
  isReadOnly?: boolean;
}

export function FieldCommentsModal({
  formId,
  fieldId,
  fieldLabel,
  isOpen,
  onClose,
  isReadOnly = false,
}: FieldCommentsModalProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open">("open");
  const [newCommentText, setNewCommentText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

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

  // Focus textarea when modal opens (if can edit)
  useEffect(() => {
    if (isOpen && !isReadOnly) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, isReadOnly]);

  // Fetch comments for form
  const { data: allComments = [], isLoading } = useQuery({
    queryKey: ["form-comments", formId],
    queryFn: () => getFormComments(formId),
    enabled: isOpen,
  });

  const fieldComments = allComments.filter((c) => c.fieldId === fieldId);
  const openCount = fieldComments.filter((c) => c.status === "open").length;
  const filteredComments =
    filter === "open" ? fieldComments.filter((c) => c.status === "open") : fieldComments;

  // Add Comment Mutation
  const addMutation = useMutation({
    mutationFn: (content: string) =>
      addFieldComment({
        formId,
        fieldId,
        content,
      }),
    onSuccess: () => {
      setNewCommentText("");
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ["form-comments", formId] });
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (err: unknown) => {
      setErrorMsg(err instanceof Error ? err.message : "Failed to post comment.");
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({
      commentId,
      nextStatus,
    }: {
      commentId: string;
      nextStatus: "open" | "resolved";
    }) => updateFieldCommentStatus(commentId, nextStatus),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["form-comments", formId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteFieldComment(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["form-comments", formId] });
    },
  });

  function handleSubmitComment(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed || isReadOnly || addMutation.isPending) return;
    addMutation.mutate(trimmed);
  }

  function handleKeyDownTextarea(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  }

  function formatTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  function getInitials(email: string): string {
    const clean = email.split("@")[0] || "U";
    return clean.slice(0, 2).toUpperCase();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 px-5 py-4 bg-neutral-50/50">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 flex-shrink-0 mt-0.5">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-neutral-900 truncate">
                Comments
              </h2>
              <p className="text-xs text-neutral-500 truncate max-w-sm mt-0.5">
                On: <span className="font-medium text-neutral-700">{fieldLabel || "Untitled question"}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-neutral-100 bg-white">
          <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilter("open")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                filter === "open"
                  ? "bg-white text-neutral-900 shadow-2xs font-semibold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Open ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-white text-neutral-900 shadow-2xs font-semibold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              All ({fieldComments.length})
            </button>
          </div>
          <span className="text-xs text-neutral-400">
            {openCount === 0 ? "All comments resolved" : `${openCount} unresolved`}
          </span>
        </div>

        {/* Comments Thread Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-neutral-50/30">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs">Loading comments...</p>
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-2">
                <MessageSquare className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-neutral-700">No {filter === "open" && fieldComments.length > 0 ? "open " : ""}comments yet</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                {isReadOnly
                  ? "No discussion comments were posted on this question."
                  : "Start a conversation with your team about this question or leave notes for yourself."}
              </p>
            </div>
          ) : (
            filteredComments.map((comment: FieldComment) => {
              const isResolved = comment.status === "resolved";
              return (
                <div
                  key={comment.id}
                  className={`group rounded-xl border p-3.5 transition-all ${
                    isResolved
                      ? "border-neutral-200/80 bg-neutral-50/60 opacity-80"
                      : "border-neutral-200 bg-white shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 flex-shrink-0">
                        {getInitials(comment.authorEmail)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-neutral-900 block truncate max-w-[200px]">
                          {comment.authorEmail}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                          <Clock className="h-3 w-3" />
                          {formatTime(comment.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isResolved && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolved
                        </span>
                      )}

                      {!isReadOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                commentId: comment.id,
                                nextStatus: isResolved ? "open" : "resolved",
                              })
                            }
                            title={isResolved ? "Reopen comment" : "Mark as resolved"}
                            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                          >
                            {isResolved ? (
                              <RotateCcw className="h-3.5 w-3.5 text-neutral-500" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 hover:text-emerald-600" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(comment.id)}
                            title="Delete comment"
                            className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap pl-9">
                    {comment.content}
                  </p>
                </div>
              );
            })
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Input Footer */}
        {isReadOnly ? (
          <div className="border-t border-neutral-100 px-5 py-3 bg-neutral-50 text-center text-xs text-neutral-500">
            Viewing comments in read-only mode.
          </div>
        ) : (
          <form
            onSubmit={handleSubmitComment}
            className="border-t border-neutral-200 p-3 bg-white"
          >
            {errorMsg && (
              <p className="text-xs text-red-600 mb-2 px-1">{errorMsg}</p>
            )}
            <div className="relative rounded-xl border border-neutral-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all bg-white">
              <textarea
                ref={textareaRef}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={handleKeyDownTextarea}
                placeholder="Leave a comment on this question... (Press Enter to post)"
                rows={2}
                maxLength={2000}
                className="w-full resize-none p-3 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none bg-transparent"
              />
              <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-100 bg-neutral-50/50 rounded-b-xl">
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <CornerDownLeft className="h-2.5 w-2.5" /> Enter to send
                </span>
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || addMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  {addMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  <span>Comment</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
