import { z } from "zod";
import { computeVisibility, allFields, isAnswered, computeCalculatedFields } from "./logic.ts";
import { LIMITS, type Field, type FieldOf, type FormSchema } from "./types.ts";
import { isRealDate } from "./util.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function mimeAllowed(mime: string, accept: string[] | undefined): boolean {
  if (!accept || accept.length === 0) return true;
  return accept.some((a) => (a.endsWith("/*") ? mime.startsWith(a.slice(0, -1)) : a === mime));
}

/* ------------------------------------------------------------------ */
/* Per-type validators                                                 */
/* These run only for fields that are visible AND answered. Required   */
/* and blank handling lives in validateSubmission.                     */
/* ------------------------------------------------------------------ */

function shortText(f: FieldOf<"short_text">): z.ZodType<unknown> {
  const { minLength, maxLength, pattern, format } = f.validation;
  const cap = Math.min(maxLength ?? LIMITS.maxShortTextLength, LIMITS.maxShortTextLength);

  let regex: RegExp | null = null;
  let badPattern = false;
  if (pattern) {
    try {
      regex = new RegExp(pattern);
    } catch {
      badPattern = true;
    }
  }

  let s = z.string().trim().max(cap, `Must be at most ${cap} characters`);
  if (minLength !== undefined) s = s.min(minLength, `Must be at least ${minLength} characters`);

  return s.superRefine((v, ctx) => {
    if (badPattern) {
      ctx.addIssue({ code: "custom", message: "This question has an invalid pattern" });
      return;
    }
    if (format === "email" && !EMAIL.test(v)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid email address" });
    }
    if (format === "url" && !isHttpUrl(v)) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid URL starting with http:// or https://",
      });
    }
    if (format === "number" && !Number.isFinite(Number(v))) {
      ctx.addIssue({ code: "custom", message: "Enter a valid number" });
    }
    if (regex && !regex.test(v)) {
      ctx.addIssue({ code: "custom", message: "Doesn't match the required format" });
    }
  });
}

function longText(f: FieldOf<"long_text">): z.ZodType<unknown> {
  const { minLength, maxLength } = f.validation;
  const cap = Math.min(maxLength ?? LIMITS.maxLongTextLength, LIMITS.maxLongTextLength);
  let s = z.string().trim().max(cap, `Must be at most ${cap} characters`);
  if (minLength !== undefined) s = s.min(minLength, `Must be at least ${minLength} characters`);
  return s;
}

function singleChoice(f: FieldOf<"multiple_choice" | "dropdown">): z.ZodType<unknown> {
  const ids = new Set(f.options.map((o) => o.id));
  const optionValidator = z.string().refine((v) => ids.has(v), "Select a valid option");
  if (!f.allowOther) return optionValidator;

  const otherValidator = z.object({
    other: z
      .string()
      .trim()
      .min(1, "Please specify an answer for 'Other'")
      .max(LIMITS.maxShortTextLength, `Must be at most ${LIMITS.maxShortTextLength} characters`),
  });

  return z.union([optionValidator, otherValidator]);
}

function checkboxes(f: FieldOf<"checkboxes">): z.ZodType<unknown> {
  const ids = new Set(f.options.map((o) => o.id));
  const { minSelected, maxSelected } = f.validation;
  const optionValidator = z.string().refine((v) => ids.has(v), "Select valid options");
  const otherValidator = z.object({
    other: z
      .string()
      .trim()
      .min(1, "Please specify an answer for 'Other'")
      .max(LIMITS.maxShortTextLength, `Must be at most ${LIMITS.maxShortTextLength} characters`),
  });

  const itemValidator = f.allowOther ? z.union([optionValidator, otherValidator]) : optionValidator;

  return z
    .array(itemValidator)
    .superRefine((arr, ctx) => {
      const stringIds = arr.filter((x): x is string => typeof x === "string");
      if (new Set(stringIds).size !== stringIds.length) {
        ctx.addIssue({ code: "custom", message: "Duplicate selections" });
      }
      const otherCount = arr.filter(
        (x) => typeof x === "object" && x !== null && "other" in x,
      ).length;
      if (otherCount > 1) {
        ctx.addIssue({ code: "custom", message: "Only one 'Other' specification is allowed" });
      }
      if (minSelected !== undefined && arr.length < minSelected) {
        ctx.addIssue({ code: "custom", message: `Select at least ${minSelected}` });
      }
      if (maxSelected !== undefined && arr.length > maxSelected) {
        ctx.addIssue({ code: "custom", message: `Select at most ${maxSelected}` });
      }
    });
}

function linearScale(f: FieldOf<"linear_scale">): z.ZodType<unknown> {
  return z
    .number()
    .int("Select a whole number")
    .min(f.min, `Must be at least ${f.min}`)
    .max(f.max, `Must be at most ${f.max}`);
}

function date(f: FieldOf<"date">): z.ZodType<unknown> {
  const { min, max } = f.validation;
  return z.string().superRefine((v, ctx) => {
    if (!isRealDate(v)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return;
    }
    if (min && v < min) ctx.addIssue({ code: "custom", message: `Must be on or after ${min}` });
    if (max && v > max) ctx.addIssue({ code: "custom", message: `Must be on or before ${max}` });
  });
}

function fileUpload(f: FieldOf<"file_upload">): z.ZodType<unknown> {
  const { maxFiles, maxSizeMb, accept } = f.validation;
  const maxBytes = maxSizeMb * 1024 * 1024;
  const file = z.object({
    path: z.string().min(1).max(500),
    name: z.string().min(1).max(255),
    size: z.number().int().nonnegative(),
    mime: z.string().min(1).max(255),
  });
  return z.array(file).superRefine((files, ctx) => {
    if (files.length > maxFiles) {
      ctx.addIssue({ code: "custom", message: `Upload at most ${maxFiles} file(s)` });
    }
    for (const x of files) {
      if (x.size > maxBytes) {
        ctx.addIssue({ code: "custom", message: `${x.name} exceeds ${maxSizeMb} MB` });
      }
      if (!mimeAllowed(x.mime, accept)) {
        ctx.addIssue({ code: "custom", message: `${x.name} is not an accepted file type` });
      }
    }
  });
}

function matrix(f: FieldOf<"matrix">): z.ZodType<unknown> {
  const rowIds = new Set(f.rows.map((r) => r.id));
  const colIds = new Set(f.columns.map((c) => c.id));

  return z.record(z.string(), z.union([z.string(), z.array(z.string())])).superRefine((val, ctx) => {
    for (const [rId, cVal] of Object.entries(val)) {
      if (!rowIds.has(rId)) {
        ctx.addIssue({ code: "custom", message: `Unknown row id: ${rId}` });
      }
      if (Array.isArray(cVal)) {
        for (const cId of cVal) {
          if (!colIds.has(cId)) {
            ctx.addIssue({ code: "custom", message: `Unknown column id: ${cId}` });
          }
        }
      } else if (typeof cVal === "string") {
        if (!colIds.has(cVal)) {
          ctx.addIssue({ code: "custom", message: `Unknown column id: ${cVal}` });
        }
      }
    }
  });
}

function ranking(f: FieldOf<"ranking">): z.ZodType<unknown> {
  const validOptionIds = new Set(f.options.map((o) => o.id));
  return z.array(z.string()).superRefine((arr, ctx) => {
    if (new Set(arr).size !== arr.length) {
      ctx.addIssue({ code: "custom", message: "Duplicate items in ranking" });
    }
    for (const optId of arr) {
      if (!validOptionIds.has(optId)) {
        ctx.addIssue({ code: "custom", message: `Unknown ranking option: ${optId}` });
      }
    }
  });
}

function signature(_f: FieldOf<"signature">): z.ZodType<unknown> {
  return z
    .string()
    .trim()
    .min(1, "Signature cannot be empty")
    .max(500_000, "Signature data exceeds maximum size");
}

function calculated(_f: FieldOf<"calculated">): z.ZodType<unknown> {
  return z.union([z.number(), z.string().trim().max(LIMITS.maxShortTextLength)]);
}

function hidden(_f: FieldOf<"hidden">): z.ZodType<unknown> {
  return z.string().trim().max(LIMITS.maxShortTextLength);
}

/** Build the validator for a single field's (non-empty) answer. */
export function fieldValidator(field: Field): z.ZodType<unknown> {
  switch (field.type) {
    case "short_text":
      return shortText(field);
    case "long_text":
      return longText(field);
    case "multiple_choice":
    case "dropdown":
      return singleChoice(field);
    case "checkboxes":
      return checkboxes(field);
    case "linear_scale":
      return linearScale(field);
    case "date":
      return date(field);
    case "file_upload":
      return fileUpload(field);
    case "matrix":
      return matrix(field);
    case "ranking":
      return ranking(field);
    case "signature":
      return signature(field);
    case "calculated":
      return calculated(field);
    case "hidden":
      return hidden(field);
    default: {
      const _exhaustive: never = field;
      throw new Error(`Unhandled field type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Submission validation                                               */
/* ------------------------------------------------------------------ */

export type SubmissionResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; errors: Record<string, string[]> };

/**
 * Authoritative validation for a submission. Same code runs in the browser (UX) and in the
 * submit Edge Function (enforcement).
 *
 *  - Hidden fields are dropped silently (a client can legitimately race a rule change).
 *  - Unknown field ids are rejected (that is tampering, not a race).
 *  - Blank answers on optional fields are omitted from `data`.
 */
export function validateSubmission(form: FormSchema, raw: unknown): SubmissionResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { success: false, errors: { _form: ["Answers must be an object"] } };
  }
  const rawAnswers = raw as Record<string, unknown>;
  const calculatedValues = computeCalculatedFields(form, rawAnswers);
  const answers: Record<string, unknown> = { ...rawAnswers, ...calculatedValues };
  const visibility = computeVisibility(form, answers);

  const errors: Record<string, string[]> = {};
  const data: Record<string, unknown> = {};

  for (const key of Object.keys(answers)) {
    if (!(key in visibility)) errors[key] = ["Unknown field"];
  }

  for (const field of allFields(form)) {
    if (!visibility[field.id]) continue;

    const value = answers[field.id];
    if (!isAnswered(value)) {
      if (field.required) errors[field.id] = ["This field is required"];
      continue;
    }

    const parsed = fieldValidator(field).safeParse(value);
    if (parsed.success) data[field.id] = parsed.data;
    else errors[field.id] = parsed.error.issues.map((i) => i.message);
  }

  return Object.keys(errors).length > 0 ? { success: false, errors } : { success: true, data };
}
