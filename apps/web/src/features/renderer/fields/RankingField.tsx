import { useEffect, useState } from "react";
import type { FieldOption } from "@formit/schema";
import type { FieldInputProps } from "./types.ts";

export function RankingInput({ field, value, onChange, ctl }: FieldInputProps<"ranking">) {
  // Current ordered list of item IDs
  const rawList = Array.isArray(value) ? (value as string[]) : [];

  // Ensure all options in field.options are present in the list
  const getInitialOrder = (): string[] => {
    const fieldOptionIds = field.options.map((opt) => opt.id);
    const existingValid = rawList.filter((id) => fieldOptionIds.includes(id));
    const missing = fieldOptionIds.filter((id) => !existingValid.includes(id));
    return [...existingValid, ...missing];
  };

  const [order, setOrder] = useState<string[]>(getInitialOrder);

  // Sync state if field options change
  useEffect(() => {
    setOrder(getInitialOrder());
  }, [field.options]);

  const move = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= order.length) return;
    const next = [...order];
    const moved = next[fromIndex];
    if (!moved) return;
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrder(next);
    onChange(next);
  };

  const optionMap = new Map<string, FieldOption>(field.options.map((opt) => [opt.id, opt]));

  return (
    <div
      role="group"
      id={ctl.id}
      aria-describedby={ctl.describedBy}
      aria-invalid={ctl.invalid}
      className="space-y-2"
    >
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
        Use the up and down arrows to arrange these options in order of priority or preference (1 = top).
      </p>
      {order.map((optId, idx) => {
        const option = optionMap.get(optId);
        if (!option) return null;
        const isFirst = idx === 0;
        const isLast = idx === order.length - 1;

        return (
          <div
            key={option.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                {idx + 1}
              </span>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {option.label}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={isFirst}
                onClick={() => move(idx, idx - 1)}
                aria-label={`Move "${option.label}" up`}
                className="p-1.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>
              <button
                type="button"
                disabled={isLast}
                onClick={() => move(idx, idx + 1)}
                aria-label={`Move "${option.label}" down`}
                className="p-1.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
