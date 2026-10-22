import { FilePlus, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FORM_TEMPLATES, type FormTemplate } from "./templates";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlank: () => void;
  onSelectTemplate: (template: FormTemplate) => void;
  isCreating?: boolean;
};

export function TemplatePickerModal({
  isOpen,
  onClose,
  onSelectBlank,
  onSelectTemplate,
  isCreating = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCreating) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, isCreating]);

  const categories = useMemo(() => {
    const cats = new Set(
      FORM_TEMPLATES.map((t) => t.category.split(" ")[0]?.replace("&", "").trim() ?? t.category),
    );
    return ["All", ...Array.from(cats)];
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FORM_TEMPLATES.filter((template) => {
      const matchesQuery =
        !q ||
        template.title.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        template.category.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === "All" ||
        template.category.toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesQuery && matchesCategory;
    });
  }, [query, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isCreating) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-picker-title"
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl border border-neutral-200/90 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-200/80 px-6 py-5 bg-neutral-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 id="template-picker-title" className="text-xl font-extrabold text-neutral-900">
                Create a new form
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-neutral-500">
              Start with an empty canvas or pick a pre-configured template with built-in validation.
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={isCreating}
            aria-label="Close template picker"
            className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-3.5 border-b border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter templates..."
              aria-label="Filter templates"
              disabled={isCreating}
              className="w-full rounded-xl border border-neutral-200 py-1.5 pl-9 pr-3 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                disabled={isCreating}
                className={`rounded-full px-3 py-1 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Start from Scratch Card */}
            {selectedCategory === "All" && !query.trim() && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => !isCreating && onSelectBlank()}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !isCreating) {
                    e.preventDefault();
                    onSelectBlank();
                  }
                }}
                className="group flex flex-col justify-between rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-5 text-left shadow-2xs hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <FilePlus className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors">
                    Blank Form
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                    Start completely from scratch with a blank canvas and add fields one by one.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neutral-400">Zero fields</span>
                  <span className="text-xs font-bold text-indigo-600 group-hover:underline">
                    Create blank &rarr;
                  </span>
                </div>
              </div>
            )}

            {/* Template Cards */}
            {filteredTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <div
                  key={template.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => !isCreating && onSelectTemplate(template)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !isCreating) {
                      e.preventDefault();
                      onSelectTemplate(template);
                    }
                  }}
                  className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-xs hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${template.color} text-white shadow-sm`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-neutral-100 border border-neutral-200/80 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                        {template.category}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors">
                      {template.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
                      {template.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-neutral-400">
                      Pre-configured
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:underline">
                      Use template &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="py-12 text-center text-sm text-neutral-400">
              No templates found matching &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200/80 bg-white px-6 py-3.5 text-xs text-neutral-500">
          <span>Press &ldquo;Esc&rdquo; to dismiss</span>
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
