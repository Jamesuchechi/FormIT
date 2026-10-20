import type { FieldInputProps } from "./types.ts";
import { inputClass, linkButtonClass, optionClass } from "./styles.ts";

export function MultipleChoiceInput({
  field,
  value,
  onChange,
  ctl,
}: FieldInputProps<"multiple_choice">) {
  return (
    <div className="space-y-2">
      {field.options.map((o) => (
        <label key={o.id} className={optionClass}>
          <input
            type="radio"
            name={ctl.id}
            value={o.id}
            checked={value === o.id}
            onChange={() => onChange(o.id)}
            aria-describedby={ctl.describedBy}
            className="size-4 accent-indigo-600"
          />
          <span>{o.label}</span>
        </label>
      ))}
      {!field.required && value !== undefined && (
        <button type="button" onClick={() => onChange(undefined)} className={linkButtonClass}>
          Clear selection
        </button>
      )}
    </div>
  );
}

export function CheckboxesInput({ field, value, onChange, ctl }: FieldInputProps<"checkboxes">) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const { maxSelected } = field.validation;
  const atMax = maxSelected !== undefined && selected.length >= maxSelected;

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);

  return (
    <div className="space-y-2">
      {field.options.map((o) => {
        const checked = selected.includes(o.id);
        return (
          <label key={o.id} className={optionClass}>
            <input
              type="checkbox"
              checked={checked}
              disabled={atMax && !checked}
              onChange={() => toggle(o.id)}
              aria-describedby={ctl.describedBy}
              className="size-4 accent-indigo-600"
            />
            <span>{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function DropdownInput({ field, value, onChange, ctl }: FieldInputProps<"dropdown">) {
  return (
    <select
      id={ctl.id}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={ctl.invalid}
      aria-describedby={ctl.describedBy}
      aria-required={field.required}
      className={inputClass}
    >
      <option value="">Select…</option>
      {field.options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
