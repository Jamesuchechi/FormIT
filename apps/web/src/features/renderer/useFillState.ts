import { allFields, computeCalculatedFields, computeVisibility, validateSubmission } from "@formit/schema";
import type { Field, FormSchema, Section } from "@formit/schema";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, describeApiError } from "../../lib/errors.ts";
import type { FillApi, PublicForm } from "../../lib/api.ts";
import { clearDraft, loadDraft, loadRemoteDraft, saveDraft } from "./draft.ts";

export type VisibleSection = { section: Section; fields: Field[] };
export type FieldErrors = Record<string, string[]>;

const DEFAULT_CONFIRMATION = "Your response has been recorded.";

const isBlank = (v: unknown) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** Focus the first control inside a field's wrapper after the DOM has settled. */
function focusField(id: string) {
  requestAnimationFrame(() => {
    document
      .getElementById(`field-${id}`)
      ?.querySelector<HTMLElement>("input, select, textarea, button")
      ?.focus();
  });
}

function getInitialAnswersFromUrl(schema: FormSchema): Record<string, unknown> {
  const params =
    typeof window !== "undefined" && window.location
      ? new URLSearchParams(window.location.search)
      : null;
  const prefilled: Record<string, unknown> = {};
  const fields = allFields(schema);

  for (const field of fields) {
    let val: string | null = null;
    if (params) {
      if (params.has(field.id)) {
        val = params.get(field.id);
      } else if (params.has(field.label)) {
        val = params.get(field.label);
      } else {
        const slugLabel = field.label.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
        if (params.has(slugLabel)) {
          val = params.get(slugLabel);
        }
      }
    }

    if (val !== null) {
      if (
        field.type === "linear_scale" ||
        (field.type === "short_text" && field.validation.format === "number")
      ) {
        const num = Number(val);
        prefilled[field.id] = Number.isFinite(num) ? num : val;
      } else if (field.type === "checkboxes") {
        prefilled[field.id] = val.split(",").map((s) => s.trim());
      } else {
        prefilled[field.id] = val;
      }
    } else if (field.type === "hidden" && field.defaultValue) {
      prefilled[field.id] = field.defaultValue;
    }
  }

  return prefilled;
}

function getNextDestination(
  currentSec: Section,
  answers: Record<string, unknown>,
  allVisibleSections: VisibleSection[],
): string | "__submit__" {
  // 1. Check if any answered field in currentSec has option-level goToSection
  for (const f of currentSec.fields) {
    if (f.type === "multiple_choice" || f.type === "dropdown") {
      const val = answers[f.id];
      if (typeof val === "string") {
        const opt = f.options.find((o) => o.id === val);
        if (opt?.goToSection) {
          if (opt.goToSection === "__submit__") return "__submit__";
          if (opt.goToSection !== "__next__") return opt.goToSection;
        }
      }
    }
  }

  // 2. Check currentSec.afterSection
  if (currentSec.afterSection === "__submit__") return "__submit__";
  if (currentSec.afterSection && currentSec.afterSection !== "__next__") {
    return currentSec.afterSection;
  }

  // 3. Fallback to next visible section
  const idx = allVisibleSections.findIndex((s) => s.section.id === currentSec.id);
  if (idx >= 0 && idx + 1 < allVisibleSections.length) {
    return allVisibleSections[idx + 1]!.section.id;
  }

  return "__submit__";
}

export function useFillState(
  form: PublicForm,
  api: FillApi,
  userId?: string,
  initialAnswers?: Record<string, unknown>,
  editKey?: string | null,
) {
  const { schema, slug, schemaVersion, id: formId } = form;

  const knownIds = useMemo(() => new Set(allFields(schema).map((f) => f.id)), [schema]);

  // Restore a draft, URL params, or pre-populated answers (e.g. from response editing via private link)
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    let base: Record<string, unknown> = {};
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      base = Object.fromEntries(Object.entries(initialAnswers).filter(([id]) => knownIds.has(id)));
    } else {
      const draft = loadDraft(slug, schemaVersion);
      if (draft) {
        base = Object.fromEntries(Object.entries(draft).filter(([id]) => knownIds.has(id)));
      }
    }

    // Prefill URL query params and hidden defaults
    const urlPrefills = getInitialAnswersFromUrl(schema);
    for (const [k, v] of Object.entries(urlPrefills)) {
      if (base[k] === undefined && knownIds.has(k)) {
        base[k] = v;
      }
    }

    // Initial calculated fields
    const calcs = computeCalculatedFields(schema, base);
    return { ...base, ...calcs };
  });

  // Sync remote draft if respondent is authenticated (only when not editing an existing response)
  useEffect(() => {
    if (!userId || !formId || editKey) return;
    let active = true;
    void loadRemoteDraft(formId, schemaVersion).then((remote) => {
      if (!active || !remote) return;
      setAnswers((prev) => {
        const validRemote = Object.fromEntries(
          Object.entries(remote).filter(([id]) => knownIds.has(id)),
        );
        const merged = { ...validRemote, ...prev };
        const calcs = computeCalculatedFields(schema, merged);
        return { ...merged, ...calcs };
      });
    });
    return () => {
      active = false;
    };
  }, [userId, formId, schemaVersion, knownIds, editKey, schema]);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [currentSectionId, setCurrentSectionId] = useState<string>(() => schema.sections[0]?.id || "");
  const [, setHistory] = useState<string[]>([]);
  const [status, setStatus] = useState<"editing" | "submitting" | "done">("editing");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [savedEditKey, setSavedEditKey] = useState<string | null>(editKey ?? null);

  const visibility = useMemo(() => computeVisibility(schema, answers), [schema, answers]);

  // Sections whose questions are all hidden are skipped entirely.
  const sections = useMemo<VisibleSection[]>(
    () =>
      schema.sections
        .map((section) => ({ section, fields: section.fields.filter((f) => visibility[f.id]) }))
        .filter((s) => s.fields.length > 0),
    [schema, visibility],
  );

  const currentSectionIndex = sections.findIndex((s) => s.section.id === currentSectionId);
  const step = currentSectionIndex >= 0 ? currentSectionIndex : 0;
  const currentSection = sections[step];

  // Make sure currentSectionId stays in sync if sections change
  useEffect(() => {
    if (sections.length > 0 && !sections.some((s) => s.section.id === currentSectionId)) {
      setCurrentSectionId(sections[0]!.section.id);
    }
  }, [sections, currentSectionId]);

  const nextTarget = currentSection
    ? getNextDestination(currentSection.section, answers, sections)
    : "__submit__";
  const isLast = nextTarget === "__submit__" || step >= sections.length - 1;

  // Debounced draft autosave.
  const first = useRef(true);
  useEffect(() => {
    if (status === "done") return;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => saveDraft(slug, schemaVersion, answers, { formId, userId }), 400);
    return () => clearTimeout(t);
  }, [answers, slug, schemaVersion, status, formId, userId]);

  const setValue = useCallback(
    (id: string, value: unknown) => {
      setAnswers((prev) => {
        const next = { ...prev };
        if (isBlank(value)) delete next[id];
        else next[id] = value;
        const calcs = computeCalculatedFields(schema, next);
        for (const [k, v] of Object.entries(calcs)) {
          next[k] = v;
        }
        return next;
      });
      setErrors((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [schema],
  );

  /** Show errors, jump to the first section that has one, and focus that field. */
  const showErrors = useCallback(
    (errs: FieldErrors) => {
      setErrors(errs);
      for (const s of sections) {
        const bad = s.fields.find((f) => errs[f.id]);
        if (bad) {
          setCurrentSectionId(s.section.id);
          focusField(bad.id);
          return;
        }
      }
      const message = Object.values(errs)[0]?.[0];
      if (message) setFormError(message);
    },
    [sections],
  );

  const submit = useCallback(async () => {
    if (status === "submitting") return;

    const result = validateSubmission(schema, answers);
    if (!result.success) {
      showErrors(result.errors);
      return;
    }

    setStatus("submitting");
    setFormError(null);
    try {
      const extras = editKey ? { editKey } : undefined;
      const res = await api.submit(slug, result.data, extras);
      clearDraft(slug, schemaVersion, { formId, userId });
      if (res.edit_key) {
        setSavedEditKey(res.edit_key);
      }
      setConfirmation(res.confirmation_message ?? form.confirmationMessage ?? DEFAULT_CONFIRMATION);
      setStatus("done");
    } catch (e) {
      setStatus("editing");
      if (e instanceof ApiError && e.code === "validation_failed" && e.details) {
        showErrors(e.details);
      } else {
        setFormError(describeApiError(e));
      }
    }
  }, [
    status,
    schema,
    answers,
    api,
    slug,
    schemaVersion,
    form.confirmationMessage,
    showErrors,
    formId,
    userId,
    editKey,
  ]);

  const next = useCallback(() => {
    const result = validateSubmission(schema, answers);
    if (!result.success) {
      const current = new Set(sections[step]?.fields.map((f) => f.id));
      const stepErrors = Object.fromEntries(
        Object.entries(result.errors).filter(([id]) => current.has(id)),
      );
      if (Object.keys(stepErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        const firstBad = sections[step]?.fields.find((f) => stepErrors[f.id]);
        if (firstBad) focusField(firstBad.id);
        return;
      }
    }

    if (!currentSection) return;
    const dest = getNextDestination(currentSection.section, answers, sections);
    if (dest === "__submit__") {
      void submit();
      return;
    }

    setHistory((prev) => [...prev, currentSection.section.id]);
    setCurrentSectionId(dest);
  }, [schema, answers, sections, step, currentSection, submit]);

  const back = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const prevSecId = prev[prev.length - 1]!;
      setCurrentSectionId(prevSecId);
      return prev.slice(0, -1);
    });
  }, []);

  const upload = useCallback(
    (fieldId: string, file: File) => api.upload(slug, fieldId, file),
    [api, slug],
  );

  return {
    answers,
    errors,
    sections,
    step,
    isLast,
    status,
    formError,
    confirmation,
    editKey: savedEditKey,
    setValue,
    next,
    back,
    submit,
    upload,
  };
}
