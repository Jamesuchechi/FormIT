import { describe, expect, it } from "vitest";
import {
  checkIntegrity,
  createField,
  FIELD_TYPES,
  parseFormSchema,
  type FormSchema,
} from "../src/index.ts";
import { form } from "./fixtures.ts";

const codes = (f: FormSchema) => checkIntegrity(f).map((i) => i.code);
const clone = (): FormSchema => structuredClone(form);

describe("checkIntegrity", () => {
  it("passes the fixture form", () => {
    expect(checkIntegrity(form)).toEqual([]);
  });

  it("flags duplicate field ids across sections", () => {
    const f = clone();
    f.sections[1]!.fields[0]!.id = "name";
    expect(codes(f)).toContain("duplicate_field_id");
  });

  it("flags duplicate section ids", () => {
    const f = clone();
    f.sections[1]!.id = "s1";
    expect(codes(f)).toContain("duplicate_section_id");
  });

  it("flags duplicate option ids", () => {
    const f = clone();
    const role = f.sections[0]!.fields[2]!;
    if (role.type === "dropdown") role.options[1]!.id = "dev";
    expect(codes(f)).toContain("duplicate_option_id");
  });

  it("flags rules referencing unknown fields", () => {
    const f = clone();
    f.sections[0]!.fields[3]!.visibleIf = { field: "ghost", op: "answered" };
    expect(codes(f)).toContain("rule_unknown_field");
  });

  it("flags self and forward references (this also rules out cycles)", () => {
    const self = clone();
    self.sections[0]!.fields[3]!.visibleIf = { field: "other_role", op: "answered" };
    expect(codes(self)).toContain("rule_forward_reference");

    const fwd = clone();
    fwd.sections[0]!.fields[0]!.visibleIf = { field: "score", op: "answered" };
    expect(codes(fwd)).toContain("rule_forward_reference");
  });

  it("flags rule values that are not option ids", () => {
    const f = clone();
    f.sections[0]!.fields[3]!.visibleIf = { field: "role", op: "eq", value: "Other" };
    expect(codes(f)).toContain("rule_invalid_option");
  });

  it("flags invalid bounds, scale range, patterns and dates", () => {
    const f = clone();
    const name = f.sections[0]!.fields[0]!;
    if (name.type === "short_text") {
      name.validation = { minLength: 10, maxLength: 5, pattern: "(" };
    }
    const score = f.sections[0]!.fields[4]!;
    if (score.type === "linear_scale") {
      score.min = 1;
      score.max = 1;
    }
    const start = f.sections[1]!.fields[3]!;
    if (start.type === "date") start.validation = { min: "2025-02-30" };
    const c = codes(f);
    expect(c).toEqual(
      expect.arrayContaining([
        "invalid_bounds",
        "invalid_pattern",
        "invalid_scale_range",
        "invalid_date",
      ]),
    );
  });
});

describe("parseFormSchema", () => {
  it("accepts a valid document and applies defaults", () => {
    const r = parseFormSchema({
      title: "T",
      sections: [{ id: "s", fields: [{ id: "q", type: "short_text", label: "Q" }] }],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      const q = r.data.sections[0]!.fields[0]!;
      expect(q.required).toBe(false);
      expect(q.type === "short_text" && q.validation).toEqual({});
    }
  });

  it("reports structural errors with a path", () => {
    const r = parseFormSchema({ title: "", sections: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.issues.every((i) => i.code === "invalid_structure")).toBe(true);
  });

  it("rejects bad ids and unknown field types", () => {
    const badId = parseFormSchema({
      title: "T",
      sections: [{ id: "has space", fields: [] }],
    });
    expect(badId.success).toBe(false);
    const badType = parseFormSchema({
      title: "T",
      sections: [{ id: "s", fields: [{ id: "q", type: "rating", label: "Q" }] }],
    });
    expect(badType.success).toBe(false);
  });

  it("runs integrity checks after structure", () => {
    const r = parseFormSchema({
      title: "T",
      sections: [
        {
          id: "s",
          fields: [
            { id: "q", type: "short_text", label: "Q" },
            { id: "q", type: "short_text", label: "Dup" },
          ],
        },
      ],
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.issues.map((i) => i.code)).toContain("duplicate_field_id");
  });
});

describe("createField", () => {
  it.each(FIELD_TYPES)(
    "%s: default field round-trips through the schema and integrity check",
    (type) => {
      const field = createField(type, "q1");
      const r = parseFormSchema({ title: "T", sections: [{ id: "s", fields: [field] }] });
      expect(r.success).toBe(true);
    },
  );
});
