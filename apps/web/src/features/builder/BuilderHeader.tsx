import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  Redo2,
  Settings as SettingsIcon,
  Share2,
  Sliders,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FormitLogo } from "../../components/FormitLogo.tsx";
import type { BuilderActions, BuilderState } from "./types.ts";

interface BuilderHeaderProps {
  state: BuilderState;
  actions: BuilderActions;
}

export function BuilderHeader({ state, actions }: BuilderHeaderProps) {
  const { form, schema, activeTab, isSaving, lastSaved, canUndo, canRedo } = state;
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const publicUrl = `${window.location.origin}/f/${form.slug}`;

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Back & Inline Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            title="Back to dashboard"
            className="flex items-center gap-2 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <FormitLogo size="xs" />
          </Link>

          <div className="min-w-0 flex items-center gap-2">
            <input
              type="text"
              value={schema.title}
              onChange={(e) => actions.updateTitle(e.target.value)}
              className="font-semibold text-lg text-neutral-900 bg-transparent border border-transparent hover:border-neutral-300 focus:border-indigo-500 focus:bg-white rounded-md px-2 py-0.5 outline-none transition-all truncate"
              placeholder="Untitled form"
            />
            {form.status === "open" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            ) : form.status === "closed" ? (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                Closed
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                Draft
              </span>
            )}
          </div>
        </div>

        {/* Center: Mode Tabs */}
        <div className="hidden md:flex rounded-lg border border-neutral-200 bg-neutral-50 p-1">
          <button
            type="button"
            onClick={() => actions.setActiveTab("builder")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "builder"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Builder
          </button>
          <button
            type="button"
            onClick={() => actions.setActiveTab("settings")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "settings"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            Settings
          </button>
          <button
            type="button"
            onClick={() => actions.setActiveTab("preview")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "preview"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
        </div>

        {/* Right: Actions, History & Save Status */}
        <div className="flex items-center gap-3">
          {/* History */}
          <div className="hidden sm:flex items-center gap-1 border-r border-neutral-200 pr-3">
            <button
              type="button"
              onClick={actions.undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={actions.redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          {/* Autosave Status */}
          <div
            className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-500"
            title={lastSaved ? `Last saved at ${lastSaved.toLocaleTimeString()}` : undefined}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Saved</span>
              </>
            )}
          </div>

          {/* Share / Publish Action */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShareOpen(!shareOpen)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>

            {shareOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-neutral-200 bg-white p-4 shadow-xl z-50">
                <h3 className="font-semibold text-sm text-neutral-900">Share this form</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  {form.status === "open"
                    ? "Anyone with the link can respond."
                    : "Form is currently in draft. Open it to allow public submissions."}
                </p>

                <div className="mt-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-xs">
                  <span className="flex-1 truncate font-mono text-neutral-700">{publicUrl}</span>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="rounded p-1 text-neutral-500 hover:bg-white hover:text-neutral-900 shadow-sm"
                    title="Copy URL"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2 border-t border-neutral-100">
                  <a
                    href={`/f/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                  >
                    Open fill page <ExternalLink className="h-3 w-3" />
                  </a>
                  {form.status !== "open" && (
                    <button
                      type="button"
                      onClick={() => {
                        actions.updateStatus("open");
                        setShareOpen(false);
                      }}
                      className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      Publish now
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
