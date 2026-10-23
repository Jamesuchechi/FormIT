import type { FieldInputProps } from "./types.ts";
import { inputClass, linkButtonClass } from "./styles.ts";

export function LinearScaleInput({ field, value, onChange, ctl }: FieldInputProps<"linear_scale">) {
  const points = Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i);
  return (
    <div className="w-full">
      <div className="flex overflow-x-auto pb-2 pt-1 -mx-1 px-1 sm:overflow-visible sm:flex-wrap items-center justify-between sm:justify-start gap-1.5 sm:gap-2.5 touch-pan-x">
        {points.map((n) => {
          const isSelected = value === n;
          return (
            <label
              key={n}
              className={`flex-1 min-w-[38px] sm:min-w-[44px] min-h-[48px] py-1.5 px-1 cursor-pointer flex flex-col items-center justify-center gap-1 rounded-lg border text-center transition-all select-none active:scale-95 touch-manipulation ${
                isSelected
                  ? "border-[var(--accent-color,#4f46e5)] bg-[var(--accent-color,#4f46e5)]/10 text-[var(--accent-color,#4f46e5)] font-semibold shadow-xs"
                  : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700"
              }`}
            >
              <span className="text-sm font-medium">{n}</span>
              <input
                type="radio"
                name={ctl.id}
                value={n}
                checked={isSelected}
                onChange={() => onChange(n)}
                aria-describedby={ctl.describedBy}
                className="size-4 accent-[var(--accent-color,#4f46e5)] cursor-pointer"
              />
            </label>
          );
        })}
      </div>
      {(field.labels?.min || field.labels?.max) && (
        <div className="mt-1 flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
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
      className={`${inputClass} w-full sm:max-w-xs`}
    />
  );
}
