import { allFields, extractFormulaVariables, validateFormulaSyntax } from "./logic.ts";
import { isChoiceField } from "./registry.ts";
import { formSchema, LIMITS, type Field, type FormSchema, type Rule } from "./types.ts";
import { isRealDate } from "./util.ts";

export type IntegrityCode =
  | "invalid_structure"
  | "too_many_fields"
  | "duplicate_section_id"
  | "duplicate_field_id"
  | "duplicate_option_id"
  | "invalid_scale_range"
  | "invalid_bounds"
  | "invalid_pattern"
  | "invalid_date"
  | "rule_unknown_field"
  | "rule_forward_reference"
  | "rule_invalid_option"
  | "rule_unknown_section"
  | "rule_invalid_section"
  | "invalid_formula";

export type IntegrityIssue = {
  code: IntegrityCode;
  message: string;
  /** Field or section id the issue belongs to, when applicable. */
  at?: string;
};

function collectRuleLeaves(rule: Rule): Extract<Rule, { field: string }>[] {
  if ("all" in rule) return rule.all.flatMap(collectRuleLeaves);
  if ("any" in rule) return rule.any.flatMap(collectRuleLeaves);
  return [rule];
}

/**
 * Semantic checks that the zod structure can't express. Run on every save in the builder
 * and again before publishing.
 *
 * Rules may only reference fields that appear EARLIER in the form. That single constraint
 * rules out self-reference and cycles, and makes evaluation a single forward pass.
 */
export function checkIntegrity(form: FormSchema): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const push = (code: IntegrityCode, message: string, at?: string) =>
    issues.push({ code, message, ...(at ? { at } : {}) });

  const fields = allFields(form);
  if (fields.length > LIMITS.maxFieldsTotal) {
    push("too_many_fields", `A form can have at most ${LIMITS.maxFieldsTotal} questions`);
  }

  const sectionIds = new Set<string>();
  const sectionIndex = new Map<string, number>();
  form.sections.forEach((s, i) => {
    if (sectionIds.has(s.id)) push("duplicate_section_id", `Duplicate section id "${s.id}"`, s.id);
    sectionIds.add(s.id);
    sectionIndex.set(s.id, i);
  });

  // Section branching checks
  form.sections.forEach((s, sIndex) => {
    if (s.afterSection) {
      if (s.afterSection === s.id) {
        push("rule_invalid_section", `After section target on "${s.id}" cannot point to itself`, s.id);
      } else if (s.afterSection !== "__submit__" && s.afterSection !== "__next__") {
        if (!sectionIds.has(s.afterSection)) {
          push("rule_unknown_section", `After section on "${s.id}" references unknown section "${s.afterSection}"`, s.id);
        } else if ((sectionIndex.get(s.afterSection) ?? 0) <= sIndex) {
          push("rule_invalid_section", `After section target on "${s.id}" must point to a later section or submit`, s.id);
        }
      }
    }

    for (const f of s.fields) {
      if (f.type === "multiple_choice" || f.type === "dropdown") {
        for (const opt of f.options) {
          if (opt.goToSection) {
            if (opt.goToSection === s.id) {
              push("rule_invalid_section", `Option "${opt.id}" in "${s.id}" cannot branch to its own section`, f.id);
            } else if (opt.goToSection !== "__submit__" && opt.goToSection !== "__next__") {
              if (!sectionIds.has(opt.goToSection)) {
                push("rule_unknown_section", `Option "${opt.id}" in "${s.id}" branches to unknown section "${opt.goToSection}"`, f.id);
              } else if ((sectionIndex.get(opt.goToSection) ?? 0) <= sIndex) {
                push("rule_invalid_section", `Option "${opt.id}" in "${s.id}" must branch to a later section or submit`, f.id);
              }
            }
          }
        }
      }
    }
  });

  const position = new Map<string, number>();
  const byId = new Map<string, Field>();
  fields.forEach((f, i) => {
    if (byId.has(f.id)) push("duplicate_field_id", `Duplicate field id "${f.id}"`, f.id);
    else {
      byId.set(f.id, f);
      position.set(f.id, i);
    }
  });

  fields.forEach((f, index) => {
    checkFieldConfig(f, push);

    if (f.type === "calculated") {
      const check = validateFormulaSyntax(f.calculation.expression);
      if (!check.valid) {
        push("invalid_formula", check.error, f.id);
      } else {
        for (const varId of extractFormulaVariables(f.calculation.expression)) {
          const source = byId.get(varId);
          if (!source) {
            push("invalid_formula", `Formula references unknown field "${varId}"`, f.id);
          } else if ((position.get(varId) ?? Infinity) >= index) {
            push(
              "invalid_formula",
              `Formula on "${f.id}" must reference an earlier question ("${varId}" is not earlier)`,
              f.id,
            );
          }
        }
      }
    }

    if (!f.visibleIf) return;
    for (const leaf of collectRuleLeaves(f.visibleIf)) {
      const source = byId.get(leaf.field);
      if (!source) {
        push("rule_unknown_field", `Rule references unknown field "${leaf.field}"`, f.id);
        continue;
      }
      if ((position.get(source.id) ?? Infinity) >= index) {
        push(
          "rule_forward_reference",
          `Rule on "${f.id}" must reference an earlier question ("${source.id}" is not earlier)`,
          f.id,
        );
        continue;
      }
      if (
        isChoiceField(source) &&
        (leaf.op === "eq" || leaf.op === "neq" || leaf.op === "contains") &&
        leaf.value !== undefined
      ) {
        const ids = new Set(source.options.map((o) => o.id));
        const values = Array.isArray(leaf.value) ? leaf.value : [leaf.value];
        if (!values.every((v) => typeof v === "string" && ids.has(v))) {
          push(
            "rule_invalid_option",
            `Rule on "${f.id}" compares "${source.id}" to a value that is not one of its options`,
            f.id,
          );
        }
      }
    }
  });

  return issues;
}

function checkFieldConfig(
  f: Field,
  push: (code: IntegrityCode, message: string, at?: string) => void,
): void {
  if (isChoiceField(f)) {
    const seen = new Set<string>();
    for (const o of f.options) {
      if (seen.has(o.id)) push("duplicate_option_id", `Duplicate option id "${o.id}"`, f.id);
      seen.add(o.id);
    }
  }

  switch (f.type) {
    case "short_text": {
      const { minLength, maxLength, pattern } = f.validation;
      if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
        push("invalid_bounds", "Minimum length exceeds maximum length", f.id);
      }
      if (pattern) {
        try {
          new RegExp(pattern);
        } catch {
          push("invalid_pattern", "Pattern is not a valid regular expression", f.id);
        }
      }
      break;
    }
    case "long_text": {
      const { minLength, maxLength } = f.validation;
      if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
        push("invalid_bounds", "Minimum length exceeds maximum length", f.id);
      }
      break;
    }
    case "checkboxes": {
      const { minSelected, maxSelected } = f.validation;
      if (minSelected !== undefined && maxSelected !== undefined && minSelected > maxSelected) {
        push("invalid_bounds", "Minimum selections exceeds maximum selections", f.id);
      }
      if (minSelected !== undefined && minSelected > f.options.length) {
        push("invalid_bounds", "Minimum selections exceeds the number of options", f.id);
      }
      break;
    }
    case "linear_scale":
      if (f.min >= f.max) push("invalid_scale_range", "Scale minimum must be below maximum", f.id);
      break;
    case "date": {
      const { min, max } = f.validation;
      if ((min && !isRealDate(min)) || (max && !isRealDate(max))) {
        push("invalid_date", "Date bounds must be real dates (YYYY-MM-DD)", f.id);
      } else if (min && max && min > max) {
        push("invalid_bounds", "Earliest date is after latest date", f.id);
      }
      break;
    }
    case "ranking": {
      const seen = new Set<string>();
      for (const o of f.options) {
        if (seen.has(o.id)) push("duplicate_option_id", `Duplicate option id "${o.id}"`, f.id);
        seen.add(o.id);
      }
      break;
    }
    case "matrix": {
      const seenRows = new Set<string>();
      for (const r of f.rows) {
        if (seenRows.has(r.id)) push("duplicate_option_id", `Duplicate row id "${r.id}"`, f.id);
        seenRows.add(r.id);
      }
      const seenCols = new Set<string>();
      for (const c of f.columns) {
        if (seenCols.has(c.id)) push("duplicate_option_id", `Duplicate column id "${c.id}"`, f.id);
        seenCols.add(c.id);
      }
      break;
    }
    default:
      break;
  }
}

export type ParseResult =
  { success: true; data: FormSchema } | { success: false; issues: IntegrityIssue[] };

/** Structure (zod) + semantics (integrity). The one entry point for untrusted form JSON. */
export function parseFormSchema(input: unknown): ParseResult {
  const structural = formSchema.safeParse(input);
  if (!structural.success) {
    return {
      success: false,
      issues: structural.error.issues.map((i) => ({
        code: "invalid_structure" as const,
        message: i.message,
        at: i.path.join("."),
      })),
    };
  }
  const issues = checkIntegrity(structural.data);
  return issues.length > 0 ? { success: false, issues } : { success: true, data: structural.data };
}
