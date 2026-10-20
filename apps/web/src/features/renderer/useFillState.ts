import { allFields, computeVisibility, validateSubmission } from "@formit/schema";
import type { Field, Section } from "@formit/schema";
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

export function useFillState(form: PublicForm, api: FillApi, userId?: string) {
  const { schema, slug, schemaVersion, id: formId } = form;

  const knownIds = useMemo(() => new Set(allFields(schema).map((f) => f.id)), [schema]);

  // Restore a draft, dropping ids that no longer exist (a form can be edited in place
  // before its first response, without a version bump).
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    const draft = loadDraft(slug, schemaVersion);
    if (!draft) return {};
    return Object.fromEntries(Object.entries(draft).filter(([id]) => knownIds.has(id)));
  });

  // Sync remote draft if respondent is authenticated
  useEffect(() => {
    if (!userId || !formId) return;
    let active = true;
    void loadRemoteDraft(formId, schemaVersion).then((remote) => {
      if (!active || !remote) return;
      setAnswers((prev) => {
        const validRemote = Object.fromEntries(
          Object.entries(remote).filter(([id]) => knownIds.has(id)),
        );
        return { ...validRemote, ...prev };
      });
    });
    return () => {
      active = false;
    };
  }, [userId, formId, schemaVersion, knownIds]);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [stepRaw, setStep] = useState(0);
  const [status, setStatus] = useState<"editing" | "submitting" | "done">("editing");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const visibility = useMemo(() => computeVisibility(schema, answers), [schema, answers]);

  // Sections whose questions are all hidden are skipped entirely.
  const sections = useMemo<VisibleSection[]>(
    () =>
      schema.sections
        .map((section) => ({ section, fields: section.fields.filter((f) => visibility[f.id]) }))
        .filter((s) => s.fields.length > 0),
    [schema, visibility],
  );

  const step = Math.min(stepRaw, Math.max(sections.length - 1, 0));
  const isLast = step >= sections.length - 1;

  // Debounced draft autosave.
  const first = useRef(true);
  useEffect(() => {
    if (status === "done") return;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(
      () => saveDraft(slug, schemaVersion, answers, { formId, userId }),
      400,
    );
    return () => clearTimeout(t);
  }, [answers, slug, schemaVersion, status, formId, userId]);

  const setValue = useCallback((id: string, value: unknown) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (isBlank(value)) delete next[id];
      else next[id] = value;
      return next;
    });
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  /** Show errors, jump to the first section that has one, and focus that field. */
  const showErrors = useCallback(
    (errs: FieldErrors) => {
      setErrors(errs);
      for (const [index, s] of sections.entries()) {
        const bad = s.fields.find((f) => errs[f.id]);
        if (bad) {
          setStep(index);
          focusField(bad.id);
          return;
        }
      }
      const message = Object.values(errs)[0]?.[0];
      if (message) setFormError(message);
    },
    [sections],
  );

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
    setStep(step + 1);
  }, [schema, answers, sections, step]);

  const back = useCallback(() => setStep(Math.max(step - 1, 0)), [step]);

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
      const res = await api.submit(slug, result.data);
      clearDraft(slug, schemaVersion, { formId, userId });
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
  }, [status, schema, answers, api, slug, schemaVersion, form.confirmationMessage, showErrors]);

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
    setValue,
    next,
    back,
    submit,
    upload,
  };
}
