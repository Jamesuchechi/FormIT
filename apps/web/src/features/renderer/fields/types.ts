import type { Field, FieldOf } from "@formit/schema";

/** Accessibility wiring computed once per field by FieldRenderer. */
export type Control = { id: string; describedBy?: string; invalid: boolean };

export type FieldInputProps<T extends Field["type"]> = {
  field: FieldOf<T>;
  value: unknown;
  onChange: (value: unknown) => void;
  ctl: Control;
};
