import { allFields, type FormSchema } from "@formit/schema";
import { useEffect, useState } from "react";
import type { BuilderActions, BuilderState } from "./types.ts";

interface UseBuilderShortcutsProps {
  state: BuilderState;
  actions: BuilderActions;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    target.getAttribute("role") === "textbox"
  );
}

function findFieldSectionId(schema: FormSchema, fieldId: string | null): string | null {
  if (!fieldId) return null;
  for (const sec of schema.sections) {
    if (sec.fields.some((f) => f.id === fieldId)) {
      return sec.id;
    }
  }
  return null;
}

export function useBuilderShortcuts({ state, actions }: UseBuilderShortcutsProps) {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const { schema, selectedFieldId, selectedSectionId } = state;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInput = isTypingTarget(e.target);
      const isMod = e.metaKey || e.ctrlKey;

      // 1. Manual Save: Cmd+S / Ctrl+S (active even while typing in an input)
      if (isMod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void actions.saveNow();
        return;
      }

      // 2. Open Shortcuts Modal: ? (when not typing) or Cmd+/ / Ctrl+/
      if ((!isInput && e.key === "?") || (isMod && e.key === "/")) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // 3. Escape: Close shortcuts modal or deselect current field
      if (e.key === "Escape") {
        if (isShortcutsOpen) {
          e.preventDefault();
          setIsShortcutsOpen(false);
          return;
        }
        if (!isInput) {
          e.preventDefault();
          actions.selectField(null);
          return;
        }
      }

      // 4. History: Undo / Redo (when not inside an input, or standard mod key outside input)
      if (isMod && !isInput) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            actions.redo();
          } else {
            actions.undo();
          }
          return;
        }
        if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          actions.redo();
          return;
        }
      }

      // 5. Add Question: Cmd+Enter / Ctrl+Enter
      if (isMod && e.key === "Enter") {
        e.preventDefault();
        const activeSectionId =
          selectedSectionId ||
          findFieldSectionId(schema, selectedFieldId) ||
          schema.sections[0]?.id;
        if (activeSectionId) {
          actions.addField(activeSectionId, "short_text", selectedFieldId || undefined);
        }
        return;
      }

      // 6. Duplicate Field: Cmd+D / Ctrl+D
      if (isMod && e.key.toLowerCase() === "d") {
        if (selectedFieldId) {
          e.preventDefault();
          const secId = findFieldSectionId(schema, selectedFieldId) || selectedSectionId;
          if (secId) {
            actions.duplicateField(secId, selectedFieldId);
          }
          return;
        }
      }

      // 7. View Mode / Tab switching via Alt+1..4 or Cmd+Alt+1..4
      if (e.altKey && !isMod) {
        if (e.key === "1") {
          e.preventDefault();
          actions.setActiveTab("builder");
          return;
        }
        if (e.key === "2") {
          e.preventDefault();
          actions.setActiveTab("theme");
          return;
        }
        if (e.key === "3") {
          e.preventDefault();
          actions.setActiveTab("settings");
          return;
        }
        if (e.key === "4") {
          e.preventDefault();
          actions.setActiveTab("preview");
          return;
        }
      }

      // The remaining shortcuts ONLY execute when the user is not actively typing in an input/textarea
      if (isInput) return;

      // 8. Delete Selected Field: Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedFieldId) {
          e.preventDefault();
          const secId = findFieldSectionId(schema, selectedFieldId) || selectedSectionId;
          if (secId) {
            actions.deleteField(secId, selectedFieldId);
          }
          return;
        }
      }

      // 9. Navigation: Down / J (next field), Up / K (previous field)
      const fields = allFields(schema);
      if (fields.length > 0) {
        if (e.key === "ArrowDown" || e.key.toLowerCase() === "j") {
          e.preventDefault();
          const currentIdx = fields.findIndex((f) => f.id === selectedFieldId);
          if (currentIdx === -1) {
            const first = fields[0]!;
            actions.selectField(first.id, findFieldSectionId(schema, first.id));
          } else if (currentIdx < fields.length - 1) {
            const next = fields[currentIdx + 1]!;
            actions.selectField(next.id, findFieldSectionId(schema, next.id));
          }
          return;
        }

        if (e.key === "ArrowUp" || e.key.toLowerCase() === "k") {
          e.preventDefault();
          const currentIdx = fields.findIndex((f) => f.id === selectedFieldId);
          if (currentIdx > 0) {
            const prev = fields[currentIdx - 1]!;
            actions.selectField(prev.id, findFieldSectionId(schema, prev.id));
          }
          return;
        }
      }

      // 10. Toggle Required on selected field: 'r'
      if (e.key.toLowerCase() === "r" && !isMod && !e.altKey) {
        if (selectedFieldId) {
          const currentField = fields.find((f) => f.id === selectedFieldId);
          const secId = findFieldSectionId(schema, selectedFieldId) || selectedSectionId;
          if (currentField && secId) {
            e.preventDefault();
            actions.updateField(secId, selectedFieldId, {
              required: !currentField.required,
            });
            return;
          }
        }
      }

      // 11. Quick tab keys when not in input: 'b' (builder), 't' (theme), 'p' (preview)
      if (!isMod && !e.altKey && !e.shiftKey) {
        if (e.key.toLowerCase() === "b") {
          e.preventDefault();
          actions.setActiveTab("builder");
          return;
        }
        if (e.key.toLowerCase() === "t") {
          e.preventDefault();
          actions.setActiveTab("theme");
          return;
        }
        if (e.key.toLowerCase() === "p") {
          e.preventDefault();
          actions.setActiveTab("preview");
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [schema, selectedFieldId, selectedSectionId, actions, isShortcutsOpen]);

  return {
    isShortcutsOpen,
    openShortcuts: () => setIsShortcutsOpen(true),
    closeShortcuts: () => setIsShortcutsOpen(false),
    toggleShortcuts: () => setIsShortcutsOpen((prev) => !prev),
  };
}
