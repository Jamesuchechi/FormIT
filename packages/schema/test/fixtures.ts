import type { FormSchema } from "../src/index.ts";

/** A form exercising every field type and chained conditional logic. */
export const form: FormSchema = {
  title: "Developer survey",
  sections: [
    {
      id: "s1",
      title: "About you",
      fields: [
        {
          id: "name",
          type: "short_text",
          label: "Name",
          required: true,
          validation: { maxLength: 50 },
        },
        {
          id: "email",
          type: "short_text",
          label: "Email",
          required: false,
          validation: { format: "email" },
        },
        {
          id: "role",
          type: "dropdown",
          label: "Role",
          required: true,
          options: [
            { id: "dev", label: "Developer" },
            { id: "other", label: "Other" },
          ],
        },
        {
          id: "other_role",
          type: "short_text",
          label: "Which role?",
          required: true,
          validation: {},
          visibleIf: { field: "role", op: "eq", value: "other" },
        },
        {
          id: "score",
          type: "linear_scale",
          label: "Satisfaction",
          required: true,
          min: 1,
          max: 5,
        },
      ],
    },
    {
      id: "s2",
      title: "Details",
      fields: [
        {
          id: "why_low",
          type: "long_text",
          label: "What went wrong?",
          required: true,
          validation: { minLength: 5 },
          visibleIf: { field: "score", op: "lt", value: 3 },
        },
        {
          // depends on why_low, which may itself be hidden
          id: "why_low_followup",
          type: "short_text",
          label: "Anything else?",
          required: true,
          validation: {},
          visibleIf: { field: "why_low", op: "answered" },
        },
        {
          id: "topics",
          type: "checkboxes",
          label: "Topics",
          required: false,
          options: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
            { id: "c", label: "C" },
          ],
          validation: { minSelected: 1, maxSelected: 2 },
        },
        {
          id: "start",
          type: "date",
          label: "Start date",
          required: false,
          validation: { min: "2025-01-01", max: "2030-12-31" },
        },
        {
          id: "resume",
          type: "file_upload",
          label: "Resume",
          required: false,
          validation: { maxFiles: 1, maxSizeMb: 1, accept: ["application/pdf", "image/*"] },
        },
      ],
    },
  ],
};
