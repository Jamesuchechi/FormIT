import type { Field, FieldOf, FileAnswer } from "@formit/schema";
import { CheckboxesInput, DropdownInput, MultipleChoiceInput } from "./fields/ChoiceFields.tsx";
import { FileInput } from "./fields/FileField.tsx";
import { MatrixInput } from "./fields/MatrixField.tsx";
import { RankingInput } from "./fields/RankingField.tsx";
import { DateInput, LinearScaleInput } from "./fields/ScaleAndDate.tsx";
import { SignatureInput } from "./fields/SignatureField.tsx";
import { LongTextInput, ShortTextInput } from "./fields/TextFields.tsx";
import type { Control } from "./fields/types.ts";

type Props = {
  field: Field;
  value: unknown;
  errors?: string[];
  onChange: (value: unknown) => void;
  onUpload: (fieldId: string, file: File) => Promise<FileAnswer>;
};

/** Types that render several controls, so they get a fieldset/legend instead of label/for. */
const GROUP_TYPES = new Set<Field["type"]>([
  "multiple_choice",
  "checkboxes",
  "linear_scale",
  "matrix",
  "ranking",
]);

export function FieldRenderer({ field, value, errors, onChange, onUpload }: Props) {
  if (field.type === "hidden") {
    return <input type="hidden" id={`in-${field.id}`} name={field.id} value={String(value ?? "")} />;
  }

  const invalid = !!errors?.length;
  const helpId = `help-${field.id}`;
  const errorId = `err-${field.id}`;
  const ctl: Control = {
    id: `in-${field.id}`,
    describedBy:
      [field.helpText ? helpId : null, invalid ? errorId : null].filter(Boolean).join(" ") ||
      undefined,
    invalid,
  };

  const title = (
    <>
      {field.label}
      {field.required && (
        <>
          <span aria-hidden="true" className="text-red-600">
            {" "}
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </>
  );

  const body = (
    <>
      {field.helpText && (
        <p id={helpId} className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          {field.helpText}
        </p>
      )}
      {field.imageUrl && (
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 max-w-xl">
          <img
            src={field.imageUrl}
            alt={field.imageAlt || field.label}
            className="w-full max-h-80 sm:max-h-96 object-contain mx-auto"
            loading="lazy"
          />
        </div>
      )}
      <div className="mt-3">{renderInput(field, value, onChange, ctl, onUpload)}</div>
      {invalid && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">
          {errors?.join(" ")}
        </p>
      )}
    </>
  );

  const card =
    "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 p-4 sm:p-5 shadow-xs text-neutral-900 dark:text-neutral-100 data-[invalid=true]:border-red-300 dark:data-[invalid=true]:border-red-500/50 transition-colors";

  return GROUP_TYPES.has(field.type) ? (
    <fieldset id={`field-${field.id}`} data-invalid={invalid} className={card}>
      <legend className="float-left w-full text-base sm:text-lg font-medium leading-snug">{title}</legend>
      <div className="clear-both">{body}</div>
    </fieldset>
  ) : (
    <div id={`field-${field.id}`} data-invalid={invalid} className={card}>
      <label htmlFor={ctl.id} className="block text-base sm:text-lg font-medium leading-snug">
        {title}
      </label>
      {body}
    </div>
  );
}

function renderInput(
  field: Field,
  value: unknown,
  onChange: (v: unknown) => void,
  ctl: Control,
  onUpload: Props["onUpload"],
) {
  switch (field.type) {
    case "short_text":
      return <ShortTextInput field={field} value={value} onChange={onChange} ctl={ctl} />;
    case "long_text":
      return <LongTextInput field={field} value={value} onChange={onChange} ctl={ctl} />;
    case "multiple_choice":
      return <MultipleChoiceInput field={field} value={value} onChange={onChange} ctl={ctl} />;
    case "checkboxes":
      return <CheckboxesInput field={field} value={value} onChange={onChange} ctl={ctl} />;
    case "dropdown":
      return <DropdownInput field={field} value={value} onChange={onChange} ctl={ctl} />;
    case "linear_scale":
      return <LinearScaleInput field={field} value={value} onChange={onChange} ctl={ctl} />;
    case "date":
      return <DateInput field={field} value={value} onChange={onChange} ctl={ctl} />;
    case "file_upload":
      return (
        <FileInput field={field} value={value} onChange={onChange} ctl={ctl} onUpload={onUpload} />
      );
    case "matrix":
      return <MatrixInput field={field} value={value} onChange={onChange} ctl={ctl} />;
    case "ranking":
      return <RankingInput field={field} value={value} onChange={onChange} ctl={ctl} />;
    case "signature":
      return <SignatureInput field={field} value={value} onChange={onChange} ctl={ctl} />;
    case "calculated":
      return <CalculatedInput field={field} value={value} />;
    case "hidden":
      return null;
    default: {
      const _exhaustive: never = field;
      throw new Error(`Unhandled field type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function CalculatedInput({ field, value }: { field: FieldOf<"calculated">; value: unknown }) {
  const num = typeof value === "number" ? value : Number(value);
  const formatted = Number.isFinite(num)
    ? num.toLocaleString(undefined, {
        minimumFractionDigits: field.calculation.decimals ?? 0,
        maximumFractionDigits: field.calculation.decimals ?? 2,
      })
    : "—";

  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 px-4 py-3 text-neutral-900 dark:text-neutral-100">
      <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight">
        {field.calculation.prefix && (
          <span className="text-neutral-400 dark:text-neutral-500 mr-1 text-lg font-medium">
            {field.calculation.prefix}
          </span>
        )}
        <span>{formatted}</span>
        {field.calculation.suffix && (
          <span className="text-neutral-400 dark:text-neutral-500 ml-1.5 text-sm font-medium">
            {field.calculation.suffix}
          </span>
        )}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 px-2 py-0.5 rounded">
        Calculated
      </span>
    </div>
  );
}
