import type { FieldInputProps } from "./types.ts";

export function MatrixInput({ field, value, onChange, ctl }: FieldInputProps<"matrix">) {
  const currentAnswers = (typeof value === "object" && value !== null ? value : {}) as Record<
    string,
    string | string[]
  >;

  const handleCellChange = (rowId: string, colId: string, checked?: boolean) => {
    if (field.multiplePerRow) {
      const existing = Array.isArray(currentAnswers[rowId])
        ? (currentAnswers[rowId] as string[])
        : [];
      const next = checked
        ? [...new Set([...existing, colId])]
        : existing.filter((id) => id !== colId);
      onChange({
        ...currentAnswers,
        [rowId]: next,
      });
    } else {
      onChange({
        ...currentAnswers,
        [rowId]: colId,
      });
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-left text-sm">
        <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300">
          <tr>
            <th scope="col" className="py-3 px-4 font-semibold w-1/3">
              {/* Row label column */}
              <span className="sr-only">Questions</span>
            </th>
            {field.columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className="py-3 px-3 font-medium text-center min-w-[80px]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900/60">
          {field.rows.map((row, rowIndex) => {
            const rowValue = currentAnswers[row.id];
            return (
              <tr
                key={row.id}
                className={
                  rowIndex % 2 === 0
                    ? "bg-transparent"
                    : "bg-neutral-50/50 dark:bg-neutral-800/20"
                }
              >
                <th
                  scope="row"
                  className="py-3.5 px-4 font-normal text-neutral-900 dark:text-neutral-100"
                >
                  {row.label}
                </th>
                {field.columns.map((col) => {
                  const isChecked = field.multiplePerRow
                    ? Array.isArray(rowValue) && rowValue.includes(col.id)
                    : rowValue === col.id;
                  const inputId = `${ctl.id}-${row.id}-${col.id}`;

                  return (
                    <td key={col.id} className="py-2.5 px-3 text-center align-middle">
                      <label
                        htmlFor={inputId}
                        className="inline-flex items-center justify-center p-2 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <input
                          type={field.multiplePerRow ? "checkbox" : "radio"}
                          id={inputId}
                          name={`${ctl.id}-${row.id}`}
                          value={col.id}
                          checked={isChecked}
                          aria-label={`${row.label}, ${col.label}`}
                          aria-invalid={ctl.invalid}
                          onChange={(e) =>
                            handleCellChange(row.id, col.id, e.target.checked)
                          }
                          className={
                            field.multiplePerRow
                              ? "h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              : "h-4 w-4 border-neutral-300 dark:border-neutral-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          }
                        />
                      </label>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
