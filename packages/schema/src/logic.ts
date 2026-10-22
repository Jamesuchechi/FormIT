import type { Field, FormSchema, Rule } from "./types.ts";

export type AnswerMap = Readonly<Record<string, unknown>>;

/** Flatten all fields in document order (section order, then field order). */
export function allFields(form: FormSchema): Field[] {
  return form.sections.flatMap((s) => s.fields);
}

/** "Answered" means non-null, non-blank string, non-empty array, or non-blank { other: string }. 0 and false count. */
export function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object" && value !== null && "other" in value) {
    const o = (value as { other: unknown }).other;
    return typeof o === "string" && o.trim() !== "";
  }
  return true;
}

function toComparable(a: unknown, b: unknown): [number, number] | [string, string] | null {
  if (typeof a === "number" && typeof b === "number") return [a, b];
  if (typeof a === "string" && typeof b === "string") {
    // Numeric strings (short_text with format "number") compare numerically.
    const na = Number(a);
    const nb = Number(b);
    if (a.trim() !== "" && b.trim() !== "" && Number.isFinite(na) && Number.isFinite(nb)) {
      return [na, nb];
    }
    // ISO dates (YYYY-MM-DD) compare correctly as strings.
    return [a, b];
  }
  if (typeof a === "number" && typeof b === "string" && b.trim() !== "" && Number.isFinite(+b)) {
    return [a, Number(b)];
  }
  if (typeof a === "string" && typeof b === "number" && a.trim() !== "" && Number.isFinite(+a)) {
    return [Number(a), b];
  }
  return null;
}

function equals(actual: unknown, expected: unknown): boolean {
  if (expected === "__other__") {
    if (typeof actual === "object" && actual !== null && "other" in actual) {
      return isAnswered(actual);
    }
    if (Array.isArray(actual)) {
      return actual.some((x) => typeof x === "object" && x !== null && "other" in x && isAnswered(x));
    }
    return false;
  }

  if (Array.isArray(actual)) {
    // Arrays (checkboxes) compare as sets; a scalar expected value means "exactly this one".
    const want = Array.isArray(expected) ? expected : [expected];
    const have = new Set(actual);
    return have.size === new Set(want).size && want.every((v) => have.has(v));
  }
  return actual === expected;
}

/** Evaluate a rule against a set of answers. Pure and total: never throws. */
export function evaluateRule(rule: Rule, answers: AnswerMap): boolean {
  if ("all" in rule) return rule.all.every((r) => evaluateRule(r, answers));
  if ("any" in rule) return rule.any.some((r) => evaluateRule(r, answers));

  const actual = answers[rule.field];
  const answered = isAnswered(actual);

  switch (rule.op) {
    case "answered":
      return answered;
    case "unanswered":
      return !answered;
    case "eq":
      return answered && equals(actual, rule.value);
    case "neq":
      return !answered || !equals(actual, rule.value);
    case "contains":
      if (Array.isArray(actual)) return actual.includes(rule.value);
      if (typeof actual === "string" && typeof rule.value === "string") {
        return actual.includes(rule.value);
      }
      return false;
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (!answered) return false;
      const pair = toComparable(actual, rule.value);
      if (!pair) return false;
      const [a, b] = pair;
      if (rule.op === "gt") return a > b;
      if (rule.op === "gte") return a >= b;
      if (rule.op === "lt") return a < b;
      return a <= b;
    }
  }
}

/**
 * Compute visibility for every field, in document order.
 *
 * A field's rule only sees answers from fields that are themselves visible, so hiding
 * a question transitively hides everything that depends on it.
 */
export function computeVisibility(form: FormSchema, answers: AnswerMap): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};
  const effective: Record<string, unknown> = {};

  for (const field of allFields(form)) {
    const visible = field.visibleIf ? evaluateRule(field.visibleIf, effective) : true;
    visibility[field.id] = visible;
    if (visible && field.id in answers) effective[field.id] = answers[field.id];
  }
  return visibility;
}

/** Drop answers for hidden and unknown fields. Returns only what should be persisted. */
export function stripHidden(form: FormSchema, answers: AnswerMap): Record<string, unknown> {
  const visibility = computeVisibility(form, answers);
  const kept: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(answers)) {
    if (visibility[id]) kept[id] = value;
  }
  return kept;
}
