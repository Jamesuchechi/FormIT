import {
  FIELD_REGISTRY,
  newId,
  type Field,
  type FieldType,
  type FormSchema,
  type FormTheme,
  type Rule,
  type Section,
} from "@formit/schema";
import { useCallback, useEffect, useRef, useState } from "react";
import { updateForm, type FormRecord, type FormSettings } from "../../lib/api.ts";
import type { BuilderActions, BuilderState, BuilderTab } from "./types.ts";

function getFormSnapshot(schema: FormSchema, form: FormRecord): string {
  return JSON.stringify({
    title: schema.title,
    description: schema.description,
    theme: schema.theme,
    sections: schema.sections,
    settings: form.settings,
    status: form.status,
    opensAt: form.opensAt,
    closesAt: form.closesAt,
  });
}

export function useBuilderState(initialForm: FormRecord): {
  state: BuilderState;
  actions: BuilderActions;
} {
  const [form, setForm] = useState<FormRecord>(initialForm);
  const [schema, setSchema] = useState<FormSchema>(initialForm.schema);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(() => {
    return initialForm.schema.sections[0]?.fields[0]?.id ?? null;
  });
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(() => {
    return initialForm.schema.sections[0]?.id ?? null;
  });

  const [activeTab, setActiveTab] = useState<BuilderTab>("builder");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(new Date());
  const [saveError, setSaveError] = useState<string | null>(null);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<FormSchema[]>([initialForm.schema]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Snapshot tracking for true dirty checking
  const lastSavedSnapshotRef = useRef<string>(getFormSnapshot(initialForm.schema, initialForm));

  // Determine if there are actual unsaved user modifications
  const currentSnapshot = getFormSnapshot(schema, form);
  const hasUnsavedChanges = currentSnapshot !== lastSavedSnapshotRef.current;

  // Push new schema to undo stack
  const commitSchema = useCallback(
    (updater: FormSchema | ((prev: FormSchema) => FormSchema)) => {
      setSchema((prev) => {
        const nextSchema = typeof updater === "function" ? updater(prev) : updater;
        setHistory((h) => {
          const sliced = h.slice(0, historyIndex + 1);
          return [...sliced, nextSchema].slice(-50); // Keep last 50 edits
        });
        setHistoryIndex((idx) => Math.min(idx + 1, 49));
        return nextSchema;
      });
    },
    [historyIndex],
  );

  // Debounced autosave to Supabase (only when there are actual unsaved changes)
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSaving(true);
      setSaveError(null);
      try {
        const cleanTitle = (schema.title || "").trim();
        const updated = await updateForm(form.id, {
          title: cleanTitle.length > 0 ? cleanTitle : "Untitled form",
          schema,
          settings: form.settings,
          status: form.status,
          opensAt: form.opensAt || null,
          closesAt: form.closesAt || null,
        });

        // Advance the baseline snapshot to the saved state
        lastSavedSnapshotRef.current = getFormSnapshot(updated.schema, updated);
        setForm(updated);
        setLastSaved(new Date());
      } catch (err: unknown) {
        console.error("Autosave failed:", err);
        setSaveError("Failed to save changes. Will retry automatically.");
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, schema, form]);

  const selectField = useCallback((fieldId: string | null, sectionId?: string | null) => {
    setSelectedFieldId(fieldId);
    if (sectionId) setSelectedSectionId(sectionId);
  }, []);

  const selectSection = useCallback((sectionId: string | null) => {
    setSelectedSectionId(sectionId);
  }, []);

  // Title & description
  const updateTitle = useCallback(
    (title: string) => {
      commitSchema((prev) => ({ ...prev, title }));
      setForm((prev) => ({ ...prev, title }));
    },
    [commitSchema],
  );

  const updateDescription = useCallback(
    (description: string) => {
      commitSchema((prev) => ({ ...prev, description }));
    },
    [commitSchema],
  );

  // Section actions
  const addSection = useCallback(() => {
    const newSectionId = newId("s");
    const newFieldId = newId("f");
    const newSec: Section = {
      id: newSectionId,
      title: `Section ${schema.sections.length + 1}`,
      fields: [FIELD_REGISTRY.short_text.create(newFieldId)],
    };

    const next = {
      ...schema,
      sections: [...schema.sections, newSec],
    };
    commitSchema(next);
    setSelectedSectionId(newSectionId);
    setSelectedFieldId(newFieldId);
  }, [schema, commitSchema]);

  const updateSection = useCallback(
    (sectionId: string, updates: Partial<Section>) => {
      const nextSections = schema.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, ...updates } : sec,
      );
      commitSchema({ ...schema, sections: nextSections });
    },
    [schema, commitSchema],
  );

  const deleteSection = useCallback(
    (sectionId: string) => {
      if (schema.sections.length <= 1) return; // Keep at least one section
      const nextSections = schema.sections.filter((sec) => sec.id !== sectionId);
      commitSchema({ ...schema, sections: nextSections });
      if (selectedSectionId === sectionId) {
        const fallbackSec = nextSections[0];
        setSelectedSectionId(fallbackSec?.id ?? null);
        setSelectedFieldId(fallbackSec?.fields[0]?.id ?? null);
      }
    },
    [schema, commitSchema, selectedSectionId],
  );

  const reorderSections = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;
      const oldIndex = schema.sections.findIndex((s) => s.id === activeId);
      const newIndex = schema.sections.findIndex((s) => s.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const nextSections = [...schema.sections];
      const [moved] = nextSections.splice(oldIndex, 1);
      if (!moved) return;
      nextSections.splice(newIndex, 0, moved);

      commitSchema({ ...schema, sections: nextSections });
    },
    [schema, commitSchema],
  );

  // Field actions
  const addField = useCallback(
    (sectionId: string, type: FieldType, afterFieldId?: string) => {
      const fieldId = newId("f");
      const newField = FIELD_REGISTRY[type].create(fieldId);

      const nextSections = schema.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const fields = [...sec.fields];
        if (afterFieldId) {
          const idx = fields.findIndex((f) => f.id === afterFieldId);
          if (idx !== -1) {
            fields.splice(idx + 1, 0, newField);
            return { ...sec, fields };
          }
        }
        fields.push(newField);
        return { ...sec, fields };
      });

      commitSchema({ ...schema, sections: nextSections });
      setSelectedFieldId(fieldId);
      setSelectedSectionId(sectionId);
    },
    [schema, commitSchema],
  );

  const updateField = useCallback(
    (sectionId: string, fieldId: string, updates: Partial<Field>) => {
      const nextSections = schema.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          fields: sec.fields.map((f) => {
            if (f.id !== fieldId) return f;
            return { ...f, ...updates } as Field;
          }),
        };
      });
      commitSchema({ ...schema, sections: nextSections });
    },
    [schema, commitSchema],
  );

  const deleteField = useCallback(
    (sectionId: string, fieldId: string) => {
      const nextSections = schema.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          fields: sec.fields.filter((f) => f.id !== fieldId),
        };
      });
      commitSchema({ ...schema, sections: nextSections });
      if (selectedFieldId === fieldId) {
        setSelectedFieldId(null);
      }
    },
    [schema, commitSchema, selectedFieldId],
  );

  const duplicateField = useCallback(
    (sectionId: string, fieldId: string) => {
      const duplicatedId = newId("f");
      const nextSections = schema.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const idx = sec.fields.findIndex((f) => f.id === fieldId);
        if (idx === -1) return sec;
        const original = sec.fields[idx];
        if (!original) return sec;
        const copy: Field = {
          ...original,
          id: duplicatedId,
          label: `${original.label} (Copy)`,
        } as Field;
        const fields = [...sec.fields];
        fields.splice(idx + 1, 0, copy);
        return { ...sec, fields };
      });

      commitSchema({ ...schema, sections: nextSections });
      setSelectedFieldId(duplicatedId);
    },
    [schema, commitSchema],
  );

  const reorderFields = useCallback(
    (sectionId: string, activeId: string, overId: string) => {
      if (activeId === overId) return;
      const nextSections = schema.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const oldIndex = sec.fields.findIndex((f) => f.id === activeId);
        const newIndex = sec.fields.findIndex((f) => f.id === overId);
        if (oldIndex === -1 || newIndex === -1) return sec;

        const fields = [...sec.fields];
        const [moved] = fields.splice(oldIndex, 1);
        if (!moved) return sec;
        fields.splice(newIndex, 0, moved);
        return { ...sec, fields };
      });

      commitSchema({ ...schema, sections: nextSections });
    },
    [schema, commitSchema],
  );

  const changeFieldType = useCallback(
    (sectionId: string, fieldId: string, newType: FieldType) => {
      const nextSections = schema.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          fields: sec.fields.map((f) => {
            if (f.id !== fieldId) return f;
            const fresh = FIELD_REGISTRY[newType].create(f.id);
            return {
              ...fresh,
              label: f.label,
              helpText: f.helpText,
              required: f.required,
            } as Field;
          }),
        };
      });
      commitSchema({ ...schema, sections: nextSections });
    },
    [schema, commitSchema],
  );

  const updateFieldRule = useCallback(
    (sectionId: string, fieldId: string, rule: Rule | undefined) => {
      updateField(sectionId, fieldId, { visibleIf: rule });
    },
    [updateField],
  );

  // Settings
  const updateSettings = useCallback((newSettings: Partial<FormSettings>) => {
    setForm((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
  }, []);

  const updateStatus = useCallback((status: "draft" | "open" | "closed") => {
    setForm((prev) => ({ ...prev, status }));
  }, []);

  const updateSlug = useCallback(
    async (newSlug: string): Promise<boolean> => {
      try {
        const updated = await updateForm(form.id, { slug: newSlug });
        setForm(updated);
        return true;
      } catch (e) {
        console.error("Slug update failed:", e);
        return false;
      }
    },
    [form.id],
  );

  // Undo / Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const target = history[prevIndex];
      if (target) {
        setHistoryIndex(prevIndex);
        setSchema(target);
      }
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const target = history[nextIndex];
      if (target) {
        setHistoryIndex(nextIndex);
        setSchema(target);
      }
    }
  }, [historyIndex, history]);

  const updateTheme = useCallback(
    (themeUpdates: Partial<FormTheme>) => {
      commitSchema((prev) => ({
        ...prev,
        theme: {
          accentColor: prev.theme?.accentColor ?? "#4f46e5",
          font: prev.theme?.font ?? "sans",
          darkMode: prev.theme?.darkMode ?? "auto",
          headerImage: prev.theme?.headerImage,
          ...themeUpdates,
        },
      }));
    },
    [commitSchema],
  );

  const saveNow = useCallback(async () => {
    setIsSaving(true);
    try {
      const cleanTitle = (schema.title || "").trim();
      const updated = await updateForm(form.id, {
        title: cleanTitle.length > 0 ? cleanTitle : "Untitled form",
        schema,
        settings: form.settings,
        status: form.status,
        opensAt: form.opensAt || null,
        closesAt: form.closesAt || null,
      });
      lastSavedSnapshotRef.current = getFormSnapshot(updated.schema, updated);
      setForm(updated);
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  }, [form.id, form.settings, form.status, form.opensAt, form.closesAt, schema]);

  return {
    state: {
      form,
      schema,
      selectedFieldId,
      selectedSectionId,
      activeTab,
      isSaving,
      hasUnsavedChanges,
      lastSaved,
      saveError,
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
    },
    actions: {
      selectField,
      selectSection,
      setActiveTab,
      updateTitle,
      updateDescription,
      addSection,
      updateSection,
      deleteSection,
      reorderSections,
      addField,
      updateField,
      deleteField,
      duplicateField,
      reorderFields,
      changeFieldType,
      updateFieldRule,
      updateSettings,
      updateStatus,
      updateSlug,
      updateTheme,
      undo,
      redo,
      saveNow,
    },
  };
}
