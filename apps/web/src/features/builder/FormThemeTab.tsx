import {
  type FormTheme,
  type ThemeFont,
  type ThemeMode,
} from "@formit/schema";
import {
  Check,
  Eye,
  Image as ImageIcon,
  Moon,
  Palette,
  Sun,
  SunMoon,
  Type,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormFiller } from "../renderer/FormFiller.tsx";
import type { FillApi, PublicForm } from "../../lib/api.ts";
import type { BuilderActions, BuilderState } from "./types.ts";

const COLOR_PRESETS = [
  { label: "Indigo", hex: "#4f46e5", bgClass: "bg-indigo-600" },
  { label: "Sky", hex: "#0284c7", bgClass: "bg-sky-600" },
  { label: "Emerald", hex: "#059669", bgClass: "bg-emerald-600" },
  { label: "Rose", hex: "#e11d48", bgClass: "bg-rose-600" },
  { label: "Amber", hex: "#d97706", bgClass: "bg-amber-600" },
  { label: "Violet", hex: "#7c3aed", bgClass: "bg-violet-600" },
  { label: "Teal", hex: "#0d9488", bgClass: "bg-teal-600" },
  { label: "Slate", hex: "#475569", bgClass: "bg-slate-600" },
];

const HEADER_IMAGE_PRESETS = [
  {
    label: "Gradient Aurora",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Minimal Architecture",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Ocean Waves",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Warm Dusk",
    url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80",
  },
];

interface FormThemeTabProps {
  state: BuilderState;
  actions: BuilderActions;
}

export function FormThemeTab({ state, actions }: FormThemeTabProps) {
  const theme: FormTheme = useMemo(
    () => ({
      accentColor: state.schema.theme?.accentColor ?? "#4f46e5",
      font: state.schema.theme?.font ?? "sans",
      darkMode: state.schema.theme?.darkMode ?? "auto",
      headerImage: state.schema.theme?.headerImage,
    }),
    [state.schema.theme],
  );

  const [headerInput, setHeaderInput] = useState(theme.headerImage ?? "");

  const [isSystemDark, setIsSystemDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setIsSystemDark(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Mock API for the theme live preview
  const previewApi: FillApi = useMemo(
    () => ({
      submit: async () => ({
        ok: true,
        id: "preview",
        confirmation_message: "Thank you! Live preview submission completed.",
      }),
      upload: async (_slug, _fieldId, file) => ({
        path: `preview/${file.name}`,
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
      }),
    }),
    [],
  );

  const previewPublicForm: PublicForm = useMemo(
    () => ({
      id: state.form.id,
      slug: state.form.slug,
      title: state.schema.title,
      schema: state.schema,
      schemaVersion: state.form.schemaVersion,
      requireSignIn: false,
      confirmationMessage: state.form.settings.confirmationMessage || null,
    }),
    [state.form.id, state.form.slug, state.form.schemaVersion, state.form.settings.confirmationMessage, state.schema],
  );

  const [mobileView, setMobileView] = useState<"controls" | "preview">("controls");

  return (
    <div className="flex flex-col lg:flex-row flex-1 h-full w-full overflow-hidden min-h-0">
      {/* Mobile subview switcher */}
      <div className="lg:hidden flex items-center justify-center p-2.5 border-b border-neutral-200 bg-white flex-shrink-0">
        <div className="flex rounded-lg border border-neutral-200 bg-neutral-100/90 p-0.5 w-full max-w-xs">
          <button
            type="button"
            onClick={() => setMobileView("controls")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all cursor-pointer ${
              mobileView === "controls"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Palette className="h-3.5 w-3.5 text-indigo-600" />
            <span>Customize</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileView("preview")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all cursor-pointer ${
              mobileView === "preview"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Eye className="h-3.5 w-3.5 text-emerald-600" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {/* Left Column: Theme Customizer Controls */}
      <div
        className={`${
          mobileView === "controls" ? "flex flex-col w-full flex-1 min-h-0" : "hidden"
        } lg:flex lg:flex-col lg:w-[440px] xl:w-[480px] lg:h-full flex-shrink-0 border-r border-neutral-200 bg-white p-4 sm:p-6 md:p-8 pb-24 sm:pb-16 overflow-y-auto space-y-6 sm:space-y-8`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <Palette className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-neutral-900">Theme & Styling</h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Customize how respondents experience your form. Changes save automatically.
          </p>
        </div>

        {/* 1. Accent Color */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Accent Color
            </label>
            <span className="font-mono text-xs font-semibold text-neutral-500">
              {theme.accentColor}
            </span>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-2.5">
            {COLOR_PRESETS.map((p) => {
              const isSelected = theme.accentColor.toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => actions.updateTheme({ accentColor: p.hex })}
                  aria-label={`Select ${p.label} accent color`}
                  className={`group relative flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-all cursor-pointer min-w-0 ${
                    isSelected
                      ? "border-neutral-900 bg-neutral-50 shadow-xs ring-2 ring-neutral-900"
                      : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full shadow-2xs flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: p.hex }}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </span>
                  <span className="text-[11px] text-neutral-700 font-semibold truncate">{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
            <input
              type="color"
              value={theme.accentColor}
              onChange={(e) => actions.updateTheme({ accentColor: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded-lg border border-neutral-300 p-0.5 bg-white flex-shrink-0"
              aria-label="Pick custom accent color"
            />
            <input
              type="text"
              value={theme.accentColor}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (/^#([0-9a-fA-F]{0,6})$/.test(val)) {
                  actions.updateTheme({ accentColor: val });
                }
              }}
              placeholder="#4f46e5"
              className="w-24 sm:w-28 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-mono text-neutral-800 uppercase focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <span className="text-[11px] text-neutral-400">Custom hex color</span>
          </div>
        </div>

        {/* 2. Typography Font */}
        <div className="space-y-3 pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-1.5">
            <Type className="h-4 w-4 text-neutral-600" />
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Font Family
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {[
              {
                id: "sans" as ThemeFont,
                label: "Modern Sans",
                sample: "Aa",
                fontClass: "font-sans",
                desc: "Clean & readable",
              },
              {
                id: "serif" as ThemeFont,
                label: "Editorial Serif",
                sample: "Aa",
                fontClass: "font-serif",
                desc: "Elegant & formal",
              },
              {
                id: "mono" as ThemeFont,
                label: "Code Mono",
                sample: "Aa",
                fontClass: "font-mono",
                desc: "Technical vibe",
              },
            ].map((f) => {
              const isSelected = theme.font === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => actions.updateTheme({ font: f.id })}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/30 text-indigo-900"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <span className={`text-2xl font-bold mb-1 ${f.fontClass}`}>{f.sample}</span>
                  <span className="text-xs font-bold">{f.label}</span>
                  <span className="text-[10px] text-neutral-400">{f.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Header Image Banner */}
        <div className="space-y-3 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-neutral-600" />
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Header Image Banner
              </label>
            </div>
            {theme.headerImage && (
              <button
                type="button"
                onClick={() => {
                  setHeaderInput("");
                  actions.updateTheme({ headerImage: "" });
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>

          {theme.headerImage ? (
            <div className="relative rounded-xl border border-neutral-200 overflow-hidden h-28 bg-neutral-100 group">
              <img
                src={theme.headerImage}
                alt="Form banner"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500">
              Pick a curated banner preset or paste a custom image URL:
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HEADER_IMAGE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setHeaderInput(preset.url);
                  actions.updateTheme({ headerImage: preset.url });
                }}
                className="flex items-center gap-2 p-1.5 rounded-lg border border-neutral-200 bg-white hover:border-indigo-400 hover:bg-neutral-50 text-left transition-all cursor-pointer min-w-0"
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="h-8 w-12 rounded object-cover flex-shrink-0"
                />
                <span className="text-[11px] font-medium text-neutral-700 truncate">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="url"
              value={headerInput}
              onChange={(e) => setHeaderInput(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              className="flex-1 min-w-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => actions.updateTheme({ headerImage: headerInput.trim() })}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors cursor-pointer flex-shrink-0"
            >
              Apply
            </button>
          </div>
        </div>

        {/* 4. Dark Mode on Fill Page */}
        <div className="space-y-3 pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-1.5">
            <Moon className="h-4 w-4 text-neutral-600" />
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Fill Page Mode
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: "auto" as ThemeMode,
                label: "Auto (System)",
                icon: SunMoon,
                desc: "Matches OS preference",
              },
              {
                id: "light" as ThemeMode,
                label: "Light",
                icon: Sun,
                desc: "Always bright",
              },
              {
                id: "dark" as ThemeMode,
                label: "Dark Mode",
                icon: Moon,
                desc: "Obsidian theme",
              },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = theme.darkMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => actions.updateTheme({ darkMode: m.id })}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/30 text-indigo-900"
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <Icon className="h-4 w-4 mb-1 text-neutral-700" />
                  <span className="text-xs font-bold">{m.label}</span>
                  <span className="text-[10px] text-neutral-400 leading-tight">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Instant Live Preview */}
      <div
        className={`${
          mobileView === "preview" ? "flex flex-col w-full flex-1 min-h-0" : "hidden"
        } lg:flex lg:flex-col flex-1 min-h-0 lg:h-full p-4 sm:p-6 md:p-10 pb-24 sm:pb-16 overflow-y-auto items-center justify-start transition-colors duration-200 ${
          theme.darkMode === "dark" || (theme.darkMode === "auto" && isSystemDark)
            ? "bg-neutral-950"
            : "bg-neutral-100/70"
        }`}
      >
        <div className="w-full max-w-2xl mb-4 flex items-center justify-between text-xs text-neutral-500 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-indigo-600" />
            Live Respondent Experience
          </span>
          <span className="rounded-full bg-white dark:bg-neutral-800 px-2.5 py-0.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-[11px]">
            Mode: {theme.darkMode.toUpperCase()}
          </span>
        </div>

        <div
          className={`w-full max-w-2xl rounded-2xl border p-4 sm:p-8 shadow-sm transition-all duration-300 ${
            theme.darkMode === "dark" || (theme.darkMode === "auto" && isSystemDark)
              ? "dark bg-neutral-900 border-neutral-800 text-neutral-100 shadow-2xl"
              : "bg-white border-neutral-200 text-neutral-900"
          }`}
        >
          <FormFiller form={previewPublicForm} api={previewApi} />
        </div>
      </div>
    </div>
  );
}
