import { describe, expect, it } from "vitest";
import { validateSubmission, type FormSchema } from "../src/index.ts";
import { form } from "./fixtures.ts";

const base = { name: "James", role: "dev", score: 5 };

describe("validateSubmission", () => {
  it("accepts a minimal valid submission", () => {
    const r = validateSubmission(form, base);
    expect(r).toEqual({ success: true, data: base });
  });

  it("rejects non-object payloads", () => {
    for (const bad of [null, "x", 1, []]) {
      const r = validateSubmission(form, bad);
      expect(r.success).toBe(false);
    }
  });

  it("enforces required, treating blanks as missing", () => {
    const r = validateSubmission(form, { name: "   ", role: "dev" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.errors.name).toEqual(["This field is required"]);
      expect(r.errors.score).toEqual(["This field is required"]);
    }
  });

  it("requires a conditional field only when it is visible", () => {
    const hidden = validateSubmission(form, base);
    expect(hidden.success).toBe(true);

    const shown = validateSubmission(form, { ...base, role: "other" });
    expect(shown.success).toBe(false);
    if (!shown.success) expect(shown.errors.other_role).toBeDefined();
  });

  it("drops hidden answers instead of persisting them", () => {
    const r = validateSubmission(form, { ...base, other_role: "smuggled" });
    expect(r).toEqual({ success: true, data: base });
  });

  it("rejects unknown field ids", () => {
    const r = validateSubmission(form, { ...base, injected: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors.injected).toEqual(["Unknown field"]);
  });

  it("omits blank optional answers from data", () => {
    const r = validateSubmission(form, { ...base, email: "", topics: [] });
    expect(r).toEqual({ success: true, data: base });
  });

  it("trims strings", () => {
    const r = validateSubmission(form, { ...base, name: "  James  " });
    expect(r.success && r.data.name).toBe("James");
  });

  it("validates short_text constraints and formats", () => {
    expect(validateSubmission(form, { ...base, name: "x".repeat(51) }).success).toBe(false);
    expect(validateSubmission(form, { ...base, email: "nope" }).success).toBe(false);
    expect(validateSubmission(form, { ...base, email: "a@b.co" }).success).toBe(true);
  });

  it("validates choices against option ids, not labels", () => {
    expect(validateSubmission(form, { ...base, role: "Developer" }).success).toBe(false);
    expect(validateSubmission(form, { ...base, role: "dev" }).success).toBe(true);
  });

  it("validates checkboxes: options, duplicates, min/max", () => {
    expect(validateSubmission(form, { ...base, topics: ["a", "b"] }).success).toBe(true);
    expect(validateSubmission(form, { ...base, topics: ["a", "b", "c"] }).success).toBe(false);
    expect(validateSubmission(form, { ...base, topics: ["a", "a"] }).success).toBe(false);
    expect(validateSubmission(form, { ...base, topics: ["zzz"] }).success).toBe(false);
  });

  it("validates linear_scale range and integrality", () => {
    expect(validateSubmission(form, { ...base, score: 0 }).success).toBe(false);
    expect(validateSubmission(form, { ...base, score: 6 }).success).toBe(false);
    expect(validateSubmission(form, { ...base, score: 3.5 }).success).toBe(false);
    expect(validateSubmission(form, { ...base, score: "5" }).success).toBe(false);
  });

  it("validates dates: real calendar date and bounds", () => {
    expect(validateSubmission(form, { ...base, start: "2026-02-30" }).success).toBe(false);
    expect(validateSubmission(form, { ...base, start: "2024-12-31" }).success).toBe(false);
    expect(validateSubmission(form, { ...base, start: "2031-01-01" }).success).toBe(false);
    expect(validateSubmission(form, { ...base, start: "2026-06-15" }).success).toBe(true);
  });

  it("validates file uploads: count, size, mime", () => {
    const file = { path: "f/1.pdf", name: "cv.pdf", size: 1000, mime: "application/pdf" };
    expect(validateSubmission(form, { ...base, resume: [file] }).success).toBe(true);
    expect(validateSubmission(form, { ...base, resume: [file, file] }).success).toBe(false);
    expect(
      validateSubmission(form, { ...base, resume: [{ ...file, size: 2 * 1024 * 1024 }] }).success,
    ).toBe(false);
    expect(
      validateSubmission(form, { ...base, resume: [{ ...file, mime: "application/zip" }] }).success,
    ).toBe(false);
    expect(
      validateSubmission(form, { ...base, resume: [{ ...file, mime: "image/png" }] }).success,
    ).toBe(true);
  });

  it("handles chained conditional logic end to end", () => {
    const low = { ...base, score: 1 };
    const r1 = validateSubmission(form, low);
    expect(r1.success).toBe(false);
    if (!r1.success) expect(r1.errors.why_low).toBeDefined();

    const r2 = validateSubmission(form, { ...low, why_low: "too slow overall" });
    expect(r2.success).toBe(false); // followup now visible and required
    if (!r2.success) expect(r2.errors.why_low_followup).toBeDefined();

    const r3 = validateSubmission(form, {
      ...low,
      why_low: "too slow overall",
      why_low_followup: "no",
    });
    expect(r3.success).toBe(true);
  });

  it("validates choice fields with allowOther", () => {
    const s1 = form.sections[0]!;
    const formWithOther: FormSchema = {
      ...form,
      sections: [
        {
          ...s1,
          fields: [
            ...s1.fields,
            {
              id: "choice_with_other",
              type: "multiple_choice" as const,
              label: "Role",
              required: true,
              options: [{ id: "opt_1", label: "Developer" }],
              allowOther: true,
            },
            {
              id: "checkbox_with_other",
              type: "checkboxes" as const,
              label: "Skills",
              required: false,
              options: [{ id: "opt_s1", label: "React" }],
              allowOther: true,
              validation: {},
            },
          ],
        },
      ],
    };

    // Valid option id
    expect(
      validateSubmission(formWithOther, {
        ...base,
        choice_with_other: "opt_1",
      }).success,
    ).toBe(true);

    // Valid { other: "Designer" }
    expect(
      validateSubmission(formWithOther, {
        ...base,
        choice_with_other: { other: "Designer" },
        checkbox_with_other: ["opt_s1", { other: "Figma" }],
      }).success,
    ).toBe(true);

    // Blank other is rejected for required field
    expect(
      validateSubmission(formWithOther, {
        ...base,
        choice_with_other: { other: "   " },
      }).success,
    ).toBe(false);

    // Multiple others in checkboxes is rejected
    expect(
      validateSubmission(formWithOther, {
        ...base,
        choice_with_other: "opt_1",
        checkbox_with_other: [{ other: "Figma" }, { other: "Sketch" }],
      }).success,
    ).toBe(false);
  });

  it("validates forms with shuffleOptions, imageUrl, and imageAlt", () => {
    const richForm: FormSchema = {
      ...form,
      sections: [
        {
          id: "s_rich",
          fields: [
            {
              id: "f_shuffled",
              type: "multiple_choice",
              label: "Pick a fruit",
              helpText: "Look at the diagram",
              imageUrl: "https://example.com/fruit-diagram.png",
              imageAlt: "A diagram of fresh fruits",
              required: true,
              shuffleOptions: true,
              options: [
                { id: "apple", label: "Apple" },
                { id: "banana", label: "Banana" },
              ],
            },
          ],
        },
      ],
    };

    const valid = validateSubmission(richForm, { f_shuffled: "banana" });
    expect(valid).toEqual({ success: true, data: { f_shuffled: "banana" } });
  });
});

