import type { Field, FieldOf, FieldType } from "./types.ts";
import { newId } from "./util.ts";

type RegistryEntry<T extends FieldType> = {
  /** Human label for the builder palette. */
  label: string;
  /** Fresh field with sensible defaults. The id is immutable from here on. */
  create: (id: string) => FieldOf<T>;
};

const opts = () => [
  { id: newId("o"), label: "Option 1" },
  { id: newId("o"), label: "Option 2" },
];

export const FIELD_REGISTRY: { [T in FieldType]: RegistryEntry<T> } = {
  short_text: {
    label: "Short answer",
    create: (id) => ({
      id,
      type: "short_text",
      label: "Untitled question",
      required: false,
      validation: {},
    }),
  },
  long_text: {
    label: "Paragraph",
    create: (id) => ({
      id,
      type: "long_text",
      label: "Untitled question",
      required: false,
      validation: {},
    }),
  },
  multiple_choice: {
    label: "Multiple choice",
    create: (id) => ({
      id,
      type: "multiple_choice",
      label: "Untitled question",
      required: false,
      options: opts(),
    }),
  },
  checkboxes: {
    label: "Checkboxes",
    create: (id) => ({
      id,
      type: "checkboxes",
      label: "Untitled question",
      required: false,
      options: opts(),
      validation: {},
    }),
  },
  dropdown: {
    label: "Dropdown",
    create: (id) => ({
      id,
      type: "dropdown",
      label: "Untitled question",
      required: false,
      options: opts(),
    }),
  },
  linear_scale: {
    label: "Linear scale",
    create: (id) => ({
      id,
      type: "linear_scale",
      label: "Untitled question",
      required: false,
      min: 1,
      max: 5,
    }),
  },
  date: {
    label: "Date",
    create: (id) => ({
      id,
      type: "date",
      label: "Untitled question",
      required: false,
      validation: {},
    }),
  },
  file_upload: {
    label: "File upload",
    create: (id) => ({
      id,
      type: "file_upload",
      label: "Untitled question",
      required: false,
      validation: { maxFiles: 1, maxSizeMb: 10 },
    }),
  },
  matrix: {
    label: "Grid / Matrix",
    create: (id) => ({
      id,
      type: "matrix",
      label: "Untitled grid question",
      required: false,
      rows: [
        { id: newId("r"), label: "Row 1" },
        { id: newId("r"), label: "Row 2" },
      ],
      columns: [
        { id: newId("c"), label: "Column 1" },
        { id: newId("c"), label: "Column 2" },
        { id: newId("c"), label: "Column 3" },
      ],
      multiplePerRow: false,
    }),
  },
  ranking: {
    label: "Ranking",
    create: (id) => ({
      id,
      type: "ranking",
      label: "Untitled ranking question",
      required: false,
      options: [
        { id: newId("o"), label: "Item 1" },
        { id: newId("o"), label: "Item 2" },
        { id: newId("o"), label: "Item 3" },
      ],
    }),
  },
  signature: {
    label: "Signature",
    create: (id) => ({
      id,
      type: "signature",
      label: "Signature",
      required: false,
      penColor: "#0f172a",
    }),
  },
};

/** Create a new field of the given type. */
export function createField<T extends FieldType>(type: T, id: string = newId("f")): FieldOf<T> {
  return FIELD_REGISTRY[type].create(id) as FieldOf<T>;
}

export const isChoiceField = (
  f: Field,
): f is FieldOf<"multiple_choice" | "dropdown" | "checkboxes"> =>
  f.type === "multiple_choice" || f.type === "dropdown" || f.type === "checkboxes";
