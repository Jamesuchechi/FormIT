import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "linear_scale",
  "date",
  "file_upload",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const RULE_OPS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "answered",
  "unanswered",
] as const;
export type RuleOp = (typeof RULE_OPS)[number];

/** Hard limits. Enforced by the zod schema and the integrity checker. */
export const LIMITS = {
  maxSections: 50,
  maxFieldsTotal: 300,
  maxOptions: 100,
  maxShortTextLength: 1_000,
  maxLongTextLength: 20_000,
  maxPatternLength: 200,
  maxFiles: 10,
  maxFileSizeMb: 100,
} as const;

/* ------------------------------------------------------------------ */
/* Ids                                                                 */
/* ------------------------------------------------------------------ */

/** Ids are opaque, stable, and safe to use as JSON keys and in URLs. */
export const idSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, "Ids may contain letters, digits, '_' and '-' (max 64)");

/* ------------------------------------------------------------------ */
/* Conditional logic rules                                             */
/* ------------------------------------------------------------------ */

export type Rule =
  { field: string; op: RuleOp; value?: unknown } | { all: Rule[] } | { any: Rule[] };

export const ruleSchema: z.ZodType<Rule> = z.lazy(() =>
  z.union([
    z
      .object({
        field: idSchema,
        op: z.enum(RULE_OPS),
        value: z.unknown().optional(),
      })
      .strict(),
    z.object({ all: z.array(ruleSchema).min(1).max(50) }).strict(),
    z.object({ any: z.array(ruleSchema).min(1).max(50) }).strict(),
  ]),
);

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const optionSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(300),
});
export type FieldOption = z.infer<typeof optionSchema>;

const options = z.array(optionSchema).min(1).max(LIMITS.maxOptions);

const base = {
  id: idSchema,
  label: z.string().trim().min(1).max(500),
  helpText: z.string().max(1_000).optional(),
  required: z.boolean().default(false),
  visibleIf: ruleSchema.optional(),
};

const shortText = z.object({
  ...base,
  type: z.literal("short_text"),
  validation: z
    .object({
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().min(1).max(LIMITS.maxShortTextLength).optional(),
      pattern: z.string().max(LIMITS.maxPatternLength).optional(),
      format: z.enum(["email", "url", "number"]).optional(),
    })
    .default({}),
});

const longText = z.object({
  ...base,
  type: z.literal("long_text"),
  validation: z
    .object({
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().min(1).max(LIMITS.maxLongTextLength).optional(),
    })
    .default({}),
});

const multipleChoice = z.object({
  ...base,
  type: z.literal("multiple_choice"),
  options,
});

const dropdown = z.object({
  ...base,
  type: z.literal("dropdown"),
  options,
});

const checkboxes = z.object({
  ...base,
  type: z.literal("checkboxes"),
  options,
  validation: z
    .object({
      minSelected: z.number().int().min(0).optional(),
      maxSelected: z.number().int().min(1).optional(),
    })
    .default({}),
});

const linearScale = z.object({
  ...base,
  type: z.literal("linear_scale"),
  min: z.number().int().min(0).max(1).default(1),
  max: z.number().int().min(2).max(10).default(5),
  labels: z
    .object({
      min: z.string().max(100).optional(),
      max: z.string().max(100).optional(),
    })
    .optional(),
});

const dateField = z.object({
  ...base,
  type: z.literal("date"),
  validation: z
    .object({
      min: isoDate.optional(),
      max: isoDate.optional(),
    })
    .default({}),
});

const fileUpload = z.object({
  ...base,
  type: z.literal("file_upload"),
  validation: z
    .object({
      maxFiles: z.number().int().min(1).max(LIMITS.maxFiles).default(1),
      maxSizeMb: z.number().min(0.1).max(LIMITS.maxFileSizeMb).default(10),
      /** MIME types, e.g. "application/pdf" or "image/*". Empty/omitted = any. */
      accept: z
        .array(z.string().regex(/^[\w.+-]+\/(\*|[\w.+-]+)$/, "Expected a MIME type like image/*"))
        .max(20)
        .optional(),
    })
    .default({}),
});

export const fieldSchema = z.discriminatedUnion("type", [
  shortText,
  longText,
  multipleChoice,
  checkboxes,
  dropdown,
  linearScale,
  dateField,
  fileUpload,
]);
export type Field = z.infer<typeof fieldSchema>;
export type FieldOf<T extends FieldType> = Extract<Field, { type: T }>;

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Themes                                                              */
/* ------------------------------------------------------------------ */

export const THEME_FONTS = ["sans", "serif", "mono"] as const;
export type ThemeFont = (typeof THEME_FONTS)[number];

export const THEME_MODES = ["auto", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const themeSchema = z.object({
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Accent color must be a valid hex color code")
    .default("#4f46e5"),
  font: z.enum(THEME_FONTS).default("sans"),
  headerImage: z.string().max(2048).optional(),
  darkMode: z.enum(THEME_MODES).default("auto"),
});
export type FormTheme = z.infer<typeof themeSchema>;

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

export const sectionSchema = z.object({
  id: idSchema,
  title: z.string().max(200).optional(),
  description: z.string().max(1_000).optional(),
  fields: z.array(fieldSchema).max(LIMITS.maxFieldsTotal),
});
export type Section = z.infer<typeof sectionSchema>;

/** The document stored in `forms.schema` / `form_versions.schema`. */
export const formSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2_000).optional(),
  theme: themeSchema.optional(),
  sections: z.array(sectionSchema).min(1).max(LIMITS.maxSections),
});
export type FormSchema = z.infer<typeof formSchema>;

/* ------------------------------------------------------------------ */
/* Answers                                                             */
/* ------------------------------------------------------------------ */

export type FileAnswer = { path: string; name: string; size: number; mime: string };

/**
 * Stored value per field type:
 *  short_text, long_text, multiple_choice, dropdown → string (option id for choices)
 *  checkboxes                                       → string[] of option ids
 *  linear_scale                                     → integer
 *  date                                             → "YYYY-MM-DD"
 *  file_upload                                      → FileAnswer[]
 */
export type AnswerValue = string | number | string[] | FileAnswer[];
export type Answers = Record<string, AnswerValue>;
