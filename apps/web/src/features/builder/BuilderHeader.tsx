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
  Keyboard,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ShareDialog } from "../../components/ShareDialog.tsx";
import { FormitLogo } from "../../components/FormitLogo.tsx";
import type { BuilderActions, BuilderState } from "./types.ts";

interface BuilderHeaderProps {
  state: BuilderState;
  actions: BuilderActions;
  onOpenShortcuts?: () => void;
}

export function BuilderHeader({ state, actions, onOpenShortcuts }: BuilderHeaderProps) {
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
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between px-3 sm:px-6 py-2 md:py-0 md:h-16 gap-y-2">
        {/* Left: Back & Inline Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 md:flex-initial">
          <Link
            to="/"
            title="Back to dashboard"
            className="flex items-center gap-1.5 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <FormitLogo size="xs" />
          </Link>

          <div className="min-w-0 flex items-center gap-2 flex-1">
            <input
              type="text"
              value={schema.title}
              onChange={(e) => actions.updateTitle(e.target.value)}
              className="font-semibold text-base sm:text-lg text-neutral-900 bg-transparent border border-transparent hover:border-neutral-300 focus:border-indigo-500 focus:bg-white rounded-md px-1.5 sm:px-2 py-0.5 outline-none transition-all truncate w-full max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:max-w-none"
              placeholder="Untitled form"
            />
            {form.status === "open" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 flex-shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live</span>
              </span>
            ) : form.status === "closed" ? (
              <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 flex-shrink-0">
                <span>Closed</span>
              </span>
            ) : (
              <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 flex-shrink-0">
                <span>Draft</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Mode Tabs (Row 2 on mobile, center on md+) */}
        <div className="order-last md:order-none w-full md:w-auto flex rounded-lg border border-neutral-200 bg-neutral-50/90 p-0.5 sm:p-1 overflow-x-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => actions.setActiveTab("builder")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "builder"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-indigo-600" />
            <span>Builder</span>
          </button>
          <button
            type="button"
            onClick={() => actions.setActiveTab("theme")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "theme"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Palette className="h-3.5 w-3.5 text-violet-600" />
            <span>Theme</span>
          </button>
          <button
            type="button"
            onClick={() => actions.setActiveTab("settings")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "settings"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <SettingsIcon className="h-3.5 w-3.5 text-amber-600" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={() => actions.setActiveTab("preview")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "preview"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Eye className="h-3.5 w-3.5 text-emerald-600" />
            <span>Preview</span>
          </button>
        </div>

        {/* Right: Actions, History & Save Status & Responses */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                title="Keyboard Shortcuts (?)"
                aria-label="Keyboard Shortcuts"
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <Keyboard className="h-4 w-4" />
              </button>
            )}
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

          {/* Responses Link - always visible on all devices */}
          <Link
            to={`/forms/${form.id}/responses`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            title="View Form Responses"
          >
            <Table2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>Responses</span>
          </Link>

          {/* Share / Publish Action */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShareOpen(!shareOpen)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 sm:px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share</span>
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
