import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Loader2,
  Redo2,
  Settings as SettingsIcon,
  Share2,
  Table2,
  Sliders,
  Undo2,
  Palette,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ShareDialog } from "../../components/ShareDialog.tsx";
import { FormitLogo } from "../../components/FormitLogo.tsx";
import type { BuilderActions, BuilderState } from "./types.ts";

interface BuilderHeaderProps {
  state: BuilderState;
  actions: BuilderActions;
}

export function BuilderHeader({ state, actions }: BuilderHeaderProps) {
  const {
    form,
    schema,
    activeTab,
    isSaving,
    hasUnsavedChanges,
    lastSaved,
    saveError,
    canUndo,
    canRedo,
  } = state;
  const [shareOpen, setShareOpen] = useState(false);

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
            onClick={() => actions.setActiveTab("theme")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              activeTab === "theme"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            Theme
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
            {saveError ? (
              <button
                type="button"
                onClick={() => void actions.saveNow()}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                title={saveError}
              >
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span>Save failed · Retry</span>
              </button>
            ) : isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                <span className="font-medium text-neutral-600">Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-700 font-medium">Unsaved changes</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span className="text-neutral-600">Saved</span>
              </>
            )}
          </div>

          <Link
            to={`/forms/${form.id}/responses`}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Table2 className="h-3.5 w-3.5" />
            Responses
          </Link>

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
              <ShareDialog
                slug={form.slug}
                title={schema.title}
                status={form.status}
                onClose={() => setShareOpen(false)}
                onPublish={() => actions.updateStatus("open")}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
