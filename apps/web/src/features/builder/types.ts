import type { Field, FieldType, FormSchema, Rule, Section } from "@formit/schema";
import type { FormRecord, FormSettings } from "../../lib/api.ts";

export type BuilderTab = "builder" | "preview" | "settings";

export interface BuilderState {
  form: FormRecord;
  schema: FormSchema;
  selectedFieldId: string | null;
  selectedSectionId: string | null;
  activeTab: BuilderTab;
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  canUndo: boolean;
  canRedo: boolean;
}

export interface BuilderActions {
  selectField: (fieldId: string | null, sectionId?: string | null) => void;
  selectSection: (sectionId: string | null) => void;
  setActiveTab: (tab: BuilderTab) => void;

  // Title & description
  updateTitle: (title: string) => void;
  updateDescription: (description: string) => void;

  // Section actions
  addSection: () => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  deleteSection: (sectionId: string) => void;
  reorderSections: (activeId: string, overId: string) => void;

  // Field actions
  addField: (sectionId: string, type: FieldType, afterFieldId?: string) => void;
  updateField: (sectionId: string, fieldId: string, updates: Partial<Field>) => void;
  deleteField: (sectionId: string, fieldId: string) => void;
  duplicateField: (sectionId: string, fieldId: string) => void;
  reorderFields: (sectionId: string, activeId: string, overId: string) => void;
  changeFieldType: (sectionId: string, fieldId: string, newType: FieldType) => void;
  updateFieldRule: (sectionId: string, fieldId: string, rule: Rule | undefined) => void;

  // Form Settings
  updateSettings: (settings: Partial<FormSettings>) => void;
  updateStatus: (status: "draft" | "open" | "closed") => void;
  updateSlug: (slug: string) => Promise<boolean>;

  // History
  undo: () => void;
  redo: () => void;
  saveNow: () => Promise<void>;
}
