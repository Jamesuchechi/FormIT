import { describe, expect, it } from "vitest";
import { computeVisibility, evaluateRule, isAnswered, stripHidden } from "../src/index.ts";
import { form } from "./fixtures.ts";

describe("isAnswered", () => {
  it("treats 0 and false as answered, blanks as not", () => {
    expect(isAnswered(0)).toBe(true);
    expect(isAnswered(false)).toBe(true);
    expect(isAnswered("")).toBe(false);
    expect(isAnswered("   ")).toBe(false);
    expect(isAnswered([])).toBe(false);
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered(null)).toBe(false);
  });
});

describe("evaluateRule", () => {
  it("eq / neq on scalars", () => {
    expect(evaluateRule({ field: "a", op: "eq", value: "x" }, { a: "x" })).toBe(true);
    expect(evaluateRule({ field: "a", op: "eq", value: "x" }, { a: "y" })).toBe(false);
    expect(evaluateRule({ field: "a", op: "neq", value: "x" }, { a: "y" })).toBe(true);
  });

  it("unanswered fields: eq false, neq true", () => {
    expect(evaluateRule({ field: "a", op: "eq", value: "x" }, {})).toBe(false);
    expect(evaluateRule({ field: "a", op: "neq", value: "x" }, {})).toBe(true);
  });

  it("eq on arrays compares as sets, contains checks membership", () => {
    expect(evaluateRule({ field: "a", op: "eq", value: ["y", "x"] }, { a: ["x", "y"] })).toBe(true);
    expect(evaluateRule({ field: "a", op: "eq", value: "x" }, { a: ["x", "y"] })).toBe(false);
    expect(evaluateRule({ field: "a", op: "contains", value: "x" }, { a: ["x", "y"] })).toBe(true);
    expect(evaluateRule({ field: "a", op: "contains", value: "z" }, { a: ["x", "y"] })).toBe(false);
  });

  it("contains does substring matching on strings", () => {
    expect(evaluateRule({ field: "a", op: "contains", value: "ell" }, { a: "hello" })).toBe(true);
  });

  it("numeric and date comparisons", () => {
    expect(evaluateRule({ field: "n", op: "gt", value: 3 }, { n: 4 })).toBe(true);
    expect(evaluateRule({ field: "n", op: "gte", value: 4 }, { n: 4 })).toBe(true);
    expect(evaluateRule({ field: "n", op: "lt", value: 4 }, { n: 4 })).toBe(false);
    expect(evaluateRule({ field: "n", op: "gt", value: 9 }, { n: "10" })).toBe(true); // numeric string
    expect(evaluateRule({ field: "d", op: "lt", value: "2025-06-01" }, { d: "2025-05-31" })).toBe(
      true,
    );
  });

  it("comparisons are false when unanswered or incomparable", () => {
    expect(evaluateRule({ field: "n", op: "gt", value: 1 }, {})).toBe(false);
    expect(evaluateRule({ field: "n", op: "gt", value: 1 }, { n: "abc" })).toBe(false);
    expect(evaluateRule({ field: "n", op: "lt", value: 1 }, { n: ["x"] })).toBe(false);
  });

  it("answered / unanswered", () => {
    expect(evaluateRule({ field: "a", op: "answered" }, { a: "x" })).toBe(true);
    expect(evaluateRule({ field: "a", op: "answered" }, { a: "  " })).toBe(false);
    expect(evaluateRule({ field: "a", op: "unanswered" }, {})).toBe(true);
  });

  it("nested all / any", () => {
    const rule = {
      all: [
        { field: "a", op: "eq" as const, value: 1 },
        {
          any: [
            { field: "b", op: "eq" as const, value: "x" },
            { field: "c", op: "eq" as const, value: "y" },
          ],
        },
      ],
    };
    expect(evaluateRule(rule, { a: 1, b: "x" })).toBe(true);
    expect(evaluateRule(rule, { a: 1, c: "y" })).toBe(true);
    expect(evaluateRule(rule, { a: 1 })).toBe(false);
    expect(evaluateRule(rule, { a: 2, b: "x" })).toBe(false);
  });
});

describe("computeVisibility", () => {
  it("shows unconditional fields and evaluates rules", () => {
    const v = computeVisibility(form, { role: "other", score: 2 });
    expect(v.name).toBe(true);
    expect(v.other_role).toBe(true);
    expect(v.why_low).toBe(true);
  });

  it("hides dependents transitively", () => {
    // score is high → why_low hidden → why_low_followup hidden even though a stale answer exists
    const v = computeVisibility(form, { score: 5, why_low: "stale answer" });
    expect(v.why_low).toBe(false);
    expect(v.why_low_followup).toBe(false);
  });

  it("a hidden source never satisfies a downstream rule", () => {
    const v = computeVisibility(form, { score: 5, why_low: "stale answer", why_low_followup: "x" });
    expect(v.why_low_followup).toBe(false);
  });
});

describe("stripHidden", () => {
  it("drops hidden and unknown answers, keeps visible ones", () => {
    const out = stripHidden(form, { name: "A", role: "dev", other_role: "smuggled", nope: 1 });
    expect(out).toEqual({ name: "A", role: "dev" });
  });
});
