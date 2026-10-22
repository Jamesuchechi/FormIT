import { describe, expect, it } from "vitest";
import { FORM_TEMPLATES, instantiateTemplate } from "./templates";
import { parseFormSchema } from "@formit/schema";

describe("FORM_TEMPLATES", () => {
  it("defines all 5 required templates", () => {
    const ids = FORM_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual([
      "contact",
      "feedback",
      "rsvp",
      "job_application",
      "event_registration",
    ]);
  });

  it.each(FORM_TEMPLATES)("instantiates valid schema for $id", (template) => {
    const schema = instantiateTemplate(template);
    const parsed = parseFormSchema(schema);
    expect(parsed.success).toBe(true);
    expect(schema.title).toBeTruthy();
    expect(schema.sections.length).toBeGreaterThan(0);
    expect(schema.sections[0]!.fields.length).toBeGreaterThan(0);
  });

  it("generates unique IDs across consecutive instantiations", () => {
    const template = FORM_TEMPLATES[2]!;
    const rsvp1 = instantiateTemplate(template);
    const rsvp2 = instantiateTemplate(template);

    expect(rsvp1.sections[0]!.id).not.toBe(rsvp2.sections[0]!.id);
    expect(rsvp1.sections[0]!.fields[0]!.id).not.toBe(rsvp2.sections[0]!.fields[0]!.id);

    // Collect all field IDs in rsvp1 to ensure they are unique within the form
    const fieldIds = rsvp1.sections.flatMap((s) => s.fields.map((f) => f.id));
    const uniqueFieldIds = new Set(fieldIds);
    expect(uniqueFieldIds.size).toBe(fieldIds.length);
  });

  it("correctly preserves conditional logic references in RSVP template", () => {
    const rsvpTemplate = FORM_TEMPLATES.find((t) => t.id === "rsvp")!;
    const schema = instantiateTemplate(rsvpTemplate);
    const fields = schema.sections[0]!.fields;

    const attendField = fields.find((f) => f.type === "multiple_choice")!;
    const yesOption = attendField.options?.find((o) => o.label.includes("Yes"))!;
    expect(yesOption).toBeDefined();

    const guestsField = fields.find((f) => f.label.includes("How many guests"))!;
    expect(guestsField.visibleIf).toEqual({
      field: attendField.id,
      op: "eq",
      value: yesOption!.id,
    });
  });
});
