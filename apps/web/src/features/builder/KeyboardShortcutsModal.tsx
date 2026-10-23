import { Keyboard, X } from "lucide-react";
import { useEffect } from "react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "General & History",
    shortcuts: [
      { keys: ["⌘ / Ctrl", "S"], description: "Save form changes immediately" },
      { keys: ["⌘ / Ctrl", "Z"], description: "Undo last change" },
      { keys: ["⌘ / Ctrl", "Shift", "Z"], description: "Redo change (or Ctrl+Y)" },
      { keys: ["?"], description: "Show this keyboard shortcuts guide" },
      { keys: ["Esc"], description: "Deselect question / Close modal" },
    ],
  },
  {
    title: "Question Management",
    shortcuts: [
      { keys: ["⌘ / Ctrl", "Enter"], description: "Add new question after current" },
      { keys: ["⌘ / Ctrl", "D"], description: "Duplicate selected question" },
      { keys: ["Delete / ⌫"], description: "Delete selected question" },
      { keys: ["R"], description: "Toggle 'Required' on selected question" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["↓", "or", "J"], description: "Select next question" },
      { keys: ["↑", "or", "K"], description: "Select previous question" },
    ],
  },
  {
    title: "View Modes & Tabs",
    shortcuts: [
      { keys: ["⌘ / Alt", "1"], description: "Switch to Form Builder (or press B)" },
      { keys: ["⌘ / Alt", "2"], description: "Switch to Theme Editor (or press T)" },
      { keys: ["⌘ / Alt", "3"], description: "Switch to Settings" },
      { keys: ["⌘ / Alt", "4"], description: "Switch to Interactive Preview (or press P)" },
    ],
  },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h3 id="shortcuts-dialog-title" className="text-base font-semibold text-neutral-900">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-neutral-500">
                Speed up form creation and editing with intuitive hotkeys
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SHORTCUT_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 pb-1.5">
                  {section.title}
                </h4>
                <div className="space-y-2">
                  {section.shortcuts.map((sc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-neutral-700 font-medium">
                        {sc.description}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {sc.keys.map((k, kidx) =>
                          k === "or" ? (
                            <span key={kidx} className="text-[10px] text-neutral-400 mx-0.5">
                              or
                            </span>
                          ) : (
                            <kbd
                              key={kidx}
                              className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded border border-neutral-300 bg-neutral-100 text-[11px] font-mono font-semibold text-neutral-800 shadow-2xs"
                            >
                              {k}
                            </kbd>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-indigo-900">
            <span className="font-semibold">Pro-tip:</span> Single-key shortcuts like{" "}
            <kbd className="px-1 py-0.5 rounded border border-indigo-200 bg-white font-mono text-[10px]">
              J
            </kbd>
            ,{" "}
            <kbd className="px-1 py-0.5 rounded border border-indigo-200 bg-white font-mono text-[10px]">
              K
            </kbd>
            , and{" "}
            <kbd className="px-1 py-0.5 rounded border border-indigo-200 bg-white font-mono text-[10px]">
              R
            </kbd>{" "}
            only activate when you are not actively typing in an input field.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-neutral-200 px-6 py-3 bg-neutral-50/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
