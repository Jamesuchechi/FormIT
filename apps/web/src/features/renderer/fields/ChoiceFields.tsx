import type { FieldInputProps } from "./types.ts";
import { inputClass, linkButtonClass, optionClass } from "./styles.ts";

export function MultipleChoiceInput({
  field,
  value,
  onChange,
  ctl,
}: FieldInputProps<"multiple_choice">) {
  const isOther = typeof value === "object" && value !== null && "other" in value;
  const otherText = isOther ? (value as { other: string }).other : "";

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
            className="size-4 accent-[var(--accent-color,#4f46e5)]"
          />
          <span>{o.label}</span>
        </label>
      ))}

      {field.allowOther && (
        <div className={`${optionClass} flex items-center gap-2`}>
          <input
            type="radio"
            name={ctl.id}
            id={`${ctl.id}-other`}
            checked={isOther}
            onChange={() => onChange({ other: "" })}
            aria-describedby={ctl.describedBy}
            className="size-4 accent-[var(--accent-color,#4f46e5)] flex-shrink-0"
          />
          <label htmlFor={`${ctl.id}-other`} className="text-sm font-medium cursor-pointer select-none">
            Other:
          </label>
          <input
            type="text"
            value={otherText}
            placeholder="Please specify"
            onFocus={() => {
              if (!isOther) onChange({ other: "" });
            }}
            onChange={(e) => onChange({ other: e.target.value })}
            className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {!field.required && value !== undefined && (
        <button type="button" onClick={() => onChange(undefined)} className={linkButtonClass}>
          Clear selection
        </button>
      )}
    </div>
  );
}

export function CheckboxesInput({ field, value, onChange, ctl }: FieldInputProps<"checkboxes">) {
  const selected = Array.isArray(value) ? (value as (string | { other: string })[]) : [];
  const { maxSelected } = field.validation;
  const atMax = maxSelected !== undefined && selected.length >= maxSelected;

  const toggle = (id: string) => {
    const isChecked = selected.includes(id);
    onChange(isChecked ? selected.filter((v) => v !== id) : [...selected, id]);
  };

  const otherItem = selected.find(
    (v) => typeof v === "object" && v !== null && "other" in v,
  ) as { other: string } | undefined;
  const isOtherChecked = !!otherItem;
  const otherText = otherItem ? otherItem.other : "";

  const toggleOther = () => {
    if (isOtherChecked) {
      onChange(selected.filter((v) => !(typeof v === "object" && v !== null && "other" in v)));
    } else {
      onChange([...selected, { other: "" }]);
    }
  };

  const handleOtherChange = (text: string) => {
    const withoutOther = selected.filter(
      (v) => !(typeof v === "object" && v !== null && "other" in v),
    );
    onChange([...withoutOther, { other: text }]);
  };

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
              className="size-4 accent-[var(--accent-color,#4f46e5)]"
            />
            <span>{o.label}</span>
          </label>
        );
      })}

      {field.allowOther && (
        <div className={`${optionClass} flex items-center gap-2`}>
          <input
            type="checkbox"
            id={`${ctl.id}-other`}
            checked={isOtherChecked}
            disabled={atMax && !isOtherChecked}
            onChange={toggleOther}
            aria-describedby={ctl.describedBy}
            className="size-4 accent-[var(--accent-color,#4f46e5)] flex-shrink-0"
          />
          <label htmlFor={`${ctl.id}-other`} className="text-sm font-medium cursor-pointer select-none">
            Other:
          </label>
          <input
            type="text"
            value={otherText}
            placeholder="Please specify"
            disabled={atMax && !isOtherChecked}
            onFocus={() => {
              if (!isOtherChecked) toggleOther();
            }}
            onChange={(e) => handleOtherChange(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-400"
          />
        </div>
      )}
    </div>
  );
}

export function DropdownInput({ field, value, onChange, ctl }: FieldInputProps<"dropdown">) {
  const isOther = typeof value === "object" && value !== null && "other" in value;
  const otherText = isOther ? (value as { other: string }).other : "";
  const selectValue = isOther ? "__other__" : typeof value === "string" ? value : "";

  return (
    <div className="space-y-2">
      <select
        id={ctl.id}
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === "__other__") {
            onChange({ other: "" });
          } else {
            onChange(e.target.value);
          }
        }}
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
        {field.allowOther && <option value="__other__">Other…</option>}
      </select>

      {isOther && (
        <input
          type="text"
          value={otherText}
          placeholder="Please specify your answer"
          onChange={(e) => onChange({ other: e.target.value })}
          className={inputClass}
          autoFocus
        />
      )}
    </div>
  );
}
