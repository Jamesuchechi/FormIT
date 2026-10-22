import type { Field, FileAnswer } from "@formit/schema";
import { CheckboxesInput, DropdownInput, MultipleChoiceInput } from "./fields/ChoiceFields.tsx";
import { FileInput } from "./fields/FileField.tsx";
import { DateInput, LinearScaleInput } from "./fields/ScaleAndDate.tsx";
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
const GROUP_TYPES = new Set<Field["type"]>(["multiple_choice", "checkboxes", "linear_scale"]);

export function FieldRenderer({ field, value, errors, onChange, onUpload }: Props) {
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
        <p id={helpId} className="mt-1 text-sm text-neutral-500">
          {field.helpText}
        </p>
      )}
      <div className="mt-3">{renderInput(field, value, onChange, ctl, onUpload)}</div>
      {invalid && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">
          {errors?.join(" ")}
        </p>
      )}
    </>
  );

  const card =
    "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 p-5 shadow-sm text-neutral-900 dark:text-neutral-100 data-[invalid=true]:border-red-300 dark:data-[invalid=true]:border-red-500/50";

  return GROUP_TYPES.has(field.type) ? (
    <fieldset id={`field-${field.id}`} data-invalid={invalid} className={card}>
      <legend className="float-left w-full text-base font-medium">{title}</legend>
      <div className="clear-both">{body}</div>
    </fieldset>
  ) : (
    <div id={`field-${field.id}`} data-invalid={invalid} className={card}>
      <label htmlFor={ctl.id} className="block text-base font-medium">
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
    default: {
      const _exhaustive: never = field;
      throw new Error(`Unhandled field type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
