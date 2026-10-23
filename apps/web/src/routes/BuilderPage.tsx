import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Loader2, Monitor, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BuilderCanvas } from "../features/builder/BuilderCanvas.tsx";
import { BuilderHeader } from "../features/builder/BuilderHeader.tsx";
import { FieldInspector } from "../features/builder/FieldInspector.tsx";
import { FieldPalette } from "../features/builder/FieldPalette.tsx";
import { FormSettingsTab } from "../features/builder/FormSettingsTab.tsx";
import { FormThemeTab } from "../features/builder/FormThemeTab.tsx";
import { useBuilderState } from "../features/builder/useBuilderState.ts";
import { FormFiller } from "../features/renderer/FormFiller.tsx";
import { getOwnerForm, type FillApi, type PublicForm } from "../lib/api.ts";

export function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const {
    data: form,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["owner-form", id],
    queryFn: () => {
      if (!id) throw new Error("Missing form ID");
      return getOwnerForm(id);
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-neutral-50 text-neutral-600">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading form builder...</p>
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-neutral-50 p-6 text-center">
        <div className="rounded-full bg-rose-100 p-3 text-rose-600 mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900">Form not found or inaccessible</h1>
        <p className="mt-2 text-sm text-neutral-600 max-w-md">
          {error instanceof Error
            ? error.message
            : "You may not have permission to edit this form, or it may have been deleted."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to forms
        </Link>
      </div>
    );
  }

  return (
    <BuilderWorkspace
      initialForm={form}
      previewDevice={previewDevice}
      setPreviewDevice={setPreviewDevice}
    />
  );
}

interface WorkspaceProps {
  initialForm: NonNullable<Awaited<ReturnType<typeof getOwnerForm>>>;
  previewDevice: "desktop" | "mobile";
  setPreviewDevice: (device: "desktop" | "mobile") => void;
}

function BuilderWorkspace({ initialForm, previewDevice, setPreviewDevice }: WorkspaceProps) {
  const { state, actions } = useBuilderState(initialForm);

  // Global keyboard shortcuts (Undo, Redo, Deselect)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          actions.redo();
        } else {
          e.preventDefault();
          actions.undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        actions.redo();
      } else if (e.key === "Escape" && !isInput) {
        actions.selectField(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);

  // Simulated FillApi for the interactive preview tab
  const previewApi: FillApi = useMemo(
    () => ({
      submit: async () => {
        await new Promise((r) => setTimeout(r, 600));
        return {
          ok: true,
          id: `preview_${crypto.randomUUID()}`,
          confirmation_message:
            state.form.settings.confirmationMessage ||
            "Thank you! Your response has been recorded (Interactive Preview Mode).",
        };
      },
      upload: async (_slug, _fieldId, file) => {
        await new Promise((r) => setTimeout(r, 400));
        return {
          path: `preview/${file.name}`,
          name: file.name,
          size: file.size,
          mime: file.type || "application/octet-stream",
        };
      },
    }),
    [state.form.settings.confirmationMessage],
  );

  // Public form projection for FormFiller
  const previewPublicForm: PublicForm = useMemo(
    () => ({
      id: state.form.id,
      slug: state.form.slug,
      title: state.schema.title,
      schema: state.schema,
      schemaVersion: state.form.schemaVersion,
      requireSignIn: Boolean(state.form.settings.requireSignIn),
      confirmationMessage: state.form.settings.confirmationMessage || null,
    }),
    [
      state.form.id,
      state.form.slug,
      state.form.schemaVersion,
      state.form.settings.requireSignIn,
      state.form.settings.confirmationMessage,
      state.schema,
    ],
  );

  const [isSystemDark, setIsSystemDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setIsSystemDark(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const previewTheme = state.schema.theme;
  const isPreviewDark =
    previewTheme?.darkMode === "dark" ||
    (previewTheme?.darkMode === "auto" && isSystemDark);

  const [mobileSubView, setMobileSubView] = useState<"canvas" | "palette" | "inspector">("canvas");

  return (
    <div className="flex h-screen max-h-[100dvh] w-screen flex-col overflow-hidden bg-neutral-100">
      {/* Top Builder Navigation */}
      <BuilderHeader state={state} actions={actions} />

      {/* Main Area based on Active Tab */}
      <div className="flex flex-1 overflow-hidden flex-col min-h-0">
        {state.activeTab === "builder" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* On screens smaller than lg, show mobile view switch bar */}
            <div className="flex lg:hidden items-center justify-between border-b border-neutral-200 bg-white px-3 py-2 flex-shrink-0">
              <div className="flex items-center gap-1 w-full bg-neutral-100 p-0.5 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMobileSubView("palette")}
                  className={`flex-1 py-1.5 text-center rounded-md transition-all ${
                    mobileSubView === "palette" ? "bg-white text-neutral-900 shadow-xs font-semibold" : "text-neutral-600"
                  }`}
                >
                  + Add Fields
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSubView("canvas")}
                  className={`flex-1 py-1.5 text-center rounded-md transition-all ${
                    mobileSubView === "canvas" ? "bg-white text-neutral-900 shadow-xs font-semibold" : "text-neutral-600"
                  }`}
                >
                  Canvas
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSubView("inspector")}
                  className={`flex-1 py-1.5 text-center rounded-md transition-all ${
                    mobileSubView === "inspector" ? "bg-white text-neutral-900 shadow-xs font-semibold" : "text-neutral-600"
                  }`}
                >
                  Inspector{state.selectedFieldId ? " •" : ""}
                </button>
              </div>
            </div>

            {/* Main Columns Container */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Column: Field Palette & Outline Tree */}
              <div
                className={`h-full ${
                  mobileSubView === "palette" ? "flex w-full" : "hidden"
                } lg:flex lg:w-72 flex-shrink-0`}
              >
                <FieldPalette state={state} actions={actions} />
              </div>

              {/* Middle Column: Interactive Form Canvas */}
              <div
                className={`h-full flex-1 overflow-hidden ${
                  mobileSubView === "canvas" ? "flex flex-col" : "hidden"
                } lg:flex lg:flex-col`}
              >
                <BuilderCanvas state={state} actions={actions} />
              </div>

              {/* Right Column: Field & Validation Inspector */}
              <div
                className={`h-full ${
                  mobileSubView === "inspector" ? "flex w-full" : "hidden"
                } lg:flex lg:w-80 flex-shrink-0`}
              >
                <FieldInspector state={state} actions={actions} />
              </div>
            </div>
          </div>
        )}

        {state.activeTab === "settings" && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-neutral-50/50">
            <FormSettingsTab state={state} actions={actions} />
          </div>
        )}

        {state.activeTab === "theme" && (
          <div className="flex flex-1 flex-col overflow-hidden min-h-0">
            <FormThemeTab state={state} actions={actions} />
          </div>
        )}

        {state.activeTab === "preview" && (
          <div className="flex flex-1 flex-col overflow-hidden bg-neutral-100">
            {/* Preview device switch bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4 sm:px-6 py-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                <Sparkles className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                <span className="truncate">Interactive Preview Mode — responses simulated locally</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    previewDevice === "desktop"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    previewDevice === "mobile"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </button>
              </div>
            </div>

            {/* Form Renderer Container */}
            <div
              className={`flex-1 overflow-y-auto p-3 sm:p-6 md:p-10 flex justify-center transition-colors duration-200 ${
                isPreviewDark ? "bg-neutral-950" : "bg-neutral-100"
              }`}
            >
              <div
                className={`w-full transition-all duration-300 ${
                  isPreviewDark
                    ? "dark bg-neutral-900 border-neutral-800 text-neutral-100 shadow-2xl"
                    : "bg-white border-neutral-200 text-neutral-900 shadow-sm"
                } ${
                  previewDevice === "mobile"
                    ? "max-w-sm rounded-[2rem] sm:rounded-[2.5rem] border-[6px] sm:border-[10px] border-neutral-800 p-4 sm:p-6 my-auto min-h-[500px]"
                    : "max-w-2xl rounded-xl sm:rounded-2xl border p-4 sm:p-8 my-auto"
                }`}
              >
                <FormFiller form={previewPublicForm} api={previewApi} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
