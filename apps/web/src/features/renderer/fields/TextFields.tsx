import { LIMITS } from "@formit/schema";
import type { FieldInputProps } from "./types.ts";
import { inputClass } from "./styles.ts";

export function ShortTextInput({ field, value, onChange, ctl }: FieldInputProps<"short_text">) {
  const { format, maxLength } = field.validation;
  return (
    <input
      id={ctl.id}
      type={format === "email" ? "email" : format === "url" ? "url" : "text"}
      inputMode={format === "number" ? "decimal" : undefined}
      autoComplete={format === "email" ? "email" : "off"}
      maxLength={maxLength ?? LIMITS.maxShortTextLength}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={ctl.invalid}
      aria-describedby={ctl.describedBy}
      aria-required={field.required}
      className={inputClass}
    />
  );
}

export function LongTextInput({ field, value, onChange, ctl }: FieldInputProps<"long_text">) {
  return (
    <textarea
      id={ctl.id}
      rows={5}
      maxLength={field.validation.maxLength ?? LIMITS.maxLongTextLength}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={ctl.invalid}
      aria-describedby={ctl.describedBy}
      aria-required={field.required}
      className={inputClass}
    />
  );
}
