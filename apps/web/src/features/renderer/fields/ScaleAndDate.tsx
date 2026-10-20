import type { FieldInputProps } from "./types.ts";
import { inputClass, linkButtonClass } from "./styles.ts";

export function LinearScaleInput({ field, value, onChange, ctl }: FieldInputProps<"linear_scale">) {
  const points = Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i);
  return (
    <div>
      <div className="flex justify-between gap-1 sm:justify-start sm:gap-3">
        {points.map((n) => (
          <label key={n} className="flex min-w-10 cursor-pointer flex-col items-center gap-1.5">
            <span className="text-sm text-neutral-600">{n}</span>
            <input
              type="radio"
              name={ctl.id}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              aria-describedby={ctl.describedBy}
              className="size-5 accent-indigo-600"
            />
          </label>
        ))}
      </div>
      {(field.labels?.min || field.labels?.max) && (
        <div className="mt-1 flex justify-between text-xs text-neutral-500">
          <span>{field.labels?.min}</span>
          <span>{field.labels?.max}</span>
        </div>
      )}
      {!field.required && value !== undefined && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={`${linkButtonClass} mt-2`}
        >
          Clear selection
        </button>
      )}
    </div>
  );
}

export function DateInput({ field, value, onChange, ctl }: FieldInputProps<"date">) {
  return (
    <input
      id={ctl.id}
      type="date"
      min={field.validation.min}
      max={field.validation.max}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={ctl.invalid}
      aria-describedby={ctl.describedBy}
      aria-required={field.required}
      className={`${inputClass} sm:max-w-xs`}
    />
  );
}
