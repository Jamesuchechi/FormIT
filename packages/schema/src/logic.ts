import type { Field, FormSchema, Rule } from "./types.ts";

export type AnswerMap = Readonly<Record<string, unknown>>;

/** Flatten all fields in document order (section order, then field order). */
export function allFields(form: FormSchema): Field[] {
  return form.sections.flatMap((s) => s.fields);
}

/** "Answered" means non-null, non-blank string, non-empty array, or non-blank { other: string } / non-empty object map. 0 and false count. */
export function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object" && value !== null) {
    if ("other" in value) {
      const o = (value as { other: unknown }).other;
      return typeof o === "string" && o.trim() !== "";
    }
    const entries = Object.entries(value);
    if (entries.length === 0) return false;
    return entries.some(([_, v]) => isAnswered(v));
  }
  return true;
}

function toComparable(a: unknown, b: unknown): [number, number] | [string, string] | null {
  if (typeof a === "number" && typeof b === "number") return [a, b];
  if (typeof a === "string" && typeof b === "string") {
    // Numeric strings (short_text with format "number") compare numerically.
    const na = Number(a);
    const nb = Number(b);
    if (a.trim() !== "" && b.trim() !== "" && Number.isFinite(na) && Number.isFinite(nb)) {
      return [na, nb];
    }
    // ISO dates (YYYY-MM-DD) compare correctly as strings.
    return [a, b];
  }
  if (typeof a === "number" && typeof b === "string" && b.trim() !== "" && Number.isFinite(+b)) {
    return [a, Number(b)];
  }
  if (typeof a === "string" && typeof b === "number" && a.trim() !== "" && Number.isFinite(+a)) {
    return [Number(a), b];
  }
  return null;
}

function equals(actual: unknown, expected: unknown): boolean {
  if (expected === "__other__") {
    if (typeof actual === "object" && actual !== null && "other" in actual) {
      return isAnswered(actual);
    }
    if (Array.isArray(actual)) {
      return actual.some((x) => typeof x === "object" && x !== null && "other" in x && isAnswered(x));
    }
    return false;
  }

  if (Array.isArray(actual)) {
    // Arrays (checkboxes) compare as sets; a scalar expected value means "exactly this one".
    const want = Array.isArray(expected) ? expected : [expected];
    const have = new Set(actual);
    return have.size === new Set(want).size && want.every((v) => have.has(v));
  }
  return actual === expected;
}

/** Evaluate a rule against a set of answers. Pure and total: never throws. */
export function evaluateRule(rule: Rule, answers: AnswerMap): boolean {
  if ("all" in rule) return rule.all.every((r) => evaluateRule(r, answers));
  if ("any" in rule) return rule.any.some((r) => evaluateRule(r, answers));

  const actual = answers[rule.field];
  const answered = isAnswered(actual);

  switch (rule.op) {
    case "answered":
      return answered;
    case "unanswered":
      return !answered;
    case "eq":
      return answered && equals(actual, rule.value);
    case "neq":
      return !answered || !equals(actual, rule.value);
    case "contains":
      if (Array.isArray(actual)) return actual.includes(rule.value);
      if (typeof actual === "string" && typeof rule.value === "string") {
        return actual.includes(rule.value);
      }
      return false;
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (!answered) return false;
      const pair = toComparable(actual, rule.value);
      if (!pair) return false;
      const [a, b] = pair;
      if (rule.op === "gt") return a > b;
      if (rule.op === "gte") return a >= b;
      if (rule.op === "lt") return a < b;
      return a <= b;
    }
  }
}

/**
 * Compute visibility for every field, in document order.
 *
/* ------------------------------------------------------------------ */
/* Formula & Calculation Logic                                         */
/* ------------------------------------------------------------------ */

type FormulaTokenType = "NUMBER" | "IDENT" | "OP" | "LPAREN" | "RPAREN" | "COMMA" | "EOF";
interface FormulaToken {
  type: FormulaTokenType;
  value: string;
  num?: number;
}

function tokenizeFormula(expr: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let i = 0;
  const len = expr.length;

  while (i < len) {
    const ch = expr[i];
    if (!ch) {
      i++;
      continue;
    }

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === "{") {
      i++;
      let ident = "";
      while (i < len && expr[i] !== "}") {
        const cur = expr[i];
        if (cur) ident += cur;
        i++;
      }
      if (i < len && expr[i] === "}") i++;
      tokens.push({ type: "IDENT", value: ident.trim() });
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "COMMA", value: "," });
      i++;
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "%" || ch === "^") {
      tokens.push({ type: "OP", value: ch });
      i++;
      continue;
    }

    const nextCh = i + 1 < len ? expr[i + 1] : undefined;
    if (/[0-9]/.test(ch) || (ch === "." && nextCh && /[0-9]/.test(nextCh))) {
      let numStr = "";
      let hasDot = false;
      while (i < len) {
        const cur = expr[i];
        if (!cur) break;
        if (/[0-9]/.test(cur)) {
          numStr += cur;
          i++;
        } else if (cur === "." && !hasDot) {
          hasDot = true;
          numStr += cur;
          i++;
        } else {
          break;
        }
      }
      tokens.push({ type: "NUMBER", value: numStr, num: parseFloat(numStr) });
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let ident = "";
      while (i < len) {
        const cur = expr[i];
        if (cur && /[A-Za-z0-9_-]/.test(cur)) {
          ident += cur;
          i++;
        } else {
          break;
        }
      }
      tokens.push({ type: "IDENT", value: ident });
      continue;
    }

    i++;
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

export function extractFormulaVariables(expression: string): string[] {
  if (!expression || !expression.trim()) return [];
  const tokens = tokenizeFormula(expression);
  const vars = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t && t.type === "IDENT") {
      const next = tokens[i + 1];
      if (next?.type !== "LPAREN") {
        vars.add(t.value);
      }
    }
  }
  return Array.from(vars);
}

export function validateFormulaSyntax(expression: string): { valid: true } | { valid: false; error: string } {
  if (!expression || !expression.trim()) {
    return { valid: false, error: "Expression cannot be empty" };
  }
  const dummyAnswers: Record<string, unknown> = {};
  for (const v of extractFormulaVariables(expression)) {
    dummyAnswers[v] = 1;
  }
  const res = evaluateFormula(expression, dummyAnswers);
  if (res === null) {
    return { valid: false, error: "Invalid formula syntax" };
  }
  return { valid: true };
}

export function evaluateFormula(expression: string, answers: AnswerMap): number | null {
  if (!expression || !expression.trim()) return null;
  try {
    const tokens = tokenizeFormula(expression);
    let pos = 0;

    function peek(): FormulaToken {
      return tokens[pos] ?? { type: "EOF", value: "" };
    }

    function consume(): FormulaToken {
      const t = peek();
      pos++;
      return t;
    }

    function parseExpression(): number {
      let left = parseTerm();
      while (peek().type === "OP" && (peek().value === "+" || peek().value === "-")) {
        const op = consume().value;
        const right = parseTerm();
        if (op === "+") left += right;
        else left -= right;
      }
      return left;
    }

    function parseTerm(): number {
      let left = parsePower();
      while (peek().type === "OP" && (peek().value === "*" || peek().value === "/" || peek().value === "%")) {
        const op = consume().value;
        const right = parsePower();
        if (op === "*") left *= right;
        else if (op === "/") {
          if (right === 0) left = 0;
          else left /= right;
        } else if (op === "%") {
          if (right === 0) left = 0;
          else left %= right;
        }
      }
      return left;
    }

    function parsePower(): number {
      let base = parseUnary();
      if (peek().type === "OP" && peek().value === "^") {
        consume();
        const exp = parsePower();
        base = Math.pow(base, exp);
      }
      return base;
    }

    function parseUnary(): number {
      if (peek().type === "OP" && peek().value === "+") {
        consume();
        return parseUnary();
      }
      if (peek().type === "OP" && peek().value === "-") {
        consume();
        return -parseUnary();
      }
      return parsePrimary();
    }

    function resolveValue(val: unknown): number {
      if (typeof val === "number") return Number.isFinite(val) ? val : 0;
      if (typeof val === "string") {
        const n = Number(val);
        return Number.isFinite(n) ? n : 0;
      }
      if (typeof val === "boolean") return val ? 1 : 0;
      if (Array.isArray(val)) return val.length;
      return 0;
    }

    function parsePrimary(): number {
      const token = peek();
      if (token.type === "NUMBER") {
        consume();
        return token.num ?? 0;
      }

      if (token.type === "LPAREN") {
        consume();
        const val = parseExpression();
        if (peek().type === "RPAREN") consume();
        return val;
      }

      if (token.type === "IDENT") {
        consume();
        const name = token.value;
        if (peek().type === "LPAREN") {
          consume();
          const args: number[] = [];
          if (peek().type !== "RPAREN") {
            args.push(parseExpression());
            while (peek().type === "COMMA") {
              consume();
              args.push(parseExpression());
            }
          }
          if (peek().type === "RPAREN") consume();

          const fn = name.toUpperCase();
          switch (fn) {
            case "SUM":
              return args.reduce((a, b) => a + b, 0);
            case "AVG":
              return args.length > 0 ? args.reduce((a, b) => a + b, 0) / args.length : 0;
            case "MIN":
              return args.length > 0 ? Math.min(...args) : 0;
            case "MAX":
              return args.length > 0 ? Math.max(...args) : 0;
            case "ROUND": {
              const num = args[0] ?? 0;
              const decimals = args[1] ?? 0;
              const factor = Math.pow(10, decimals);
              return Math.round(num * factor) / factor;
            }
            case "ABS":
              return Math.abs(args[0] ?? 0);
            case "FLOOR":
              return Math.floor(args[0] ?? 0);
            case "CEIL":
              return Math.ceil(args[0] ?? 0);
            case "IF":
              return (args[0] ?? 0) !== 0 ? (args[1] ?? 0) : (args[2] ?? 0);
            default:
              return 0;
          }
        }

        const raw = answers[name];
        return resolveValue(raw);
      }

      consume();
      return 0;
    }

    const res = parseExpression();
    if (peek().type !== "EOF") return null;
    return Number.isFinite(res) ? res : 0;
  } catch {
    return null;
  }
}

export function computeCalculatedFields(form: FormSchema, answers: AnswerMap): Record<string, number> {
  const result: Record<string, number> = {};
  const effective: Record<string, unknown> = { ...answers };

  for (const field of allFields(form)) {
    if (field.type === "calculated") {
      const val = evaluateFormula(field.calculation.expression, effective);
      if (val !== null) {
        const decimals = field.calculation.decimals ?? 2;
        const rounded = Number(val.toFixed(decimals));
        result[field.id] = rounded;
        effective[field.id] = rounded;
      }
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Section Branching Logic                                             */
/* ------------------------------------------------------------------ */

export function getReachableSectionIds(form: FormSchema, answers: AnswerMap): Set<string> {
  const reachable = new Set<string>();
  if (form.sections.length === 0) return reachable;

  const sectionMap = new Map(form.sections.map((s, idx) => [s.id, { section: s, index: idx }]));
  let currentId: string | undefined = form.sections[0]?.id;

  while (currentId && !reachable.has(currentId)) {
    reachable.add(currentId);
    const item = sectionMap.get(currentId);
    if (!item) break;

    let branchTarget: string | undefined = undefined;
    for (const field of item.section.fields) {
      if (field.type === "multiple_choice" || field.type === "dropdown") {
        const val = answers[field.id];
        if (typeof val === "string") {
          const opt = field.options.find((o) => o.id === val);
          if (opt?.goToSection) {
            branchTarget = opt.goToSection;
            break;
          }
        }
      }
    }

    if (branchTarget === "__submit__") {
      break;
    } else if (branchTarget && branchTarget !== "__next__" && sectionMap.has(branchTarget)) {
      currentId = branchTarget;
    } else if (item.section.afterSection === "__submit__") {
      break;
    } else if (
      item.section.afterSection &&
      item.section.afterSection !== "__next__" &&
      sectionMap.has(item.section.afterSection)
    ) {
      currentId = item.section.afterSection;
    } else {
      currentId = form.sections[item.index + 1]?.id;
    }
  }

  return reachable;
}

/**
 * Compute visibility for every field, in document order.
 *
 * A field's rule only sees answers from fields that are themselves visible, so hiding
 * a question transitively hides everything that depends on it.
 *
 * In addition, fields in sections that are skipped by section branching are marked hidden.
 */
export function computeVisibility(form: FormSchema, answers: AnswerMap): Record<string, boolean> {
  const reachableSections = getReachableSectionIds(form, answers);
  const visibility: Record<string, boolean> = {};
  const effective: Record<string, unknown> = {};

  for (const section of form.sections) {
    const isReachable = reachableSections.has(section.id);
    for (const field of section.fields) {
      if (!isReachable) {
        visibility[field.id] = false;
        continue;
      }
      const visible = field.visibleIf ? evaluateRule(field.visibleIf, effective) : true;
      visibility[field.id] = visible;
      if (visible) {
        if (field.type === "calculated") {
          const val = evaluateFormula(field.calculation.expression, effective);
          if (val !== null) {
            const decimals = field.calculation.decimals ?? 2;
            const rounded = Number(val.toFixed(decimals));
            effective[field.id] = rounded;
          }
        } else if (field.id in answers) {
          effective[field.id] = answers[field.id];
        }
      }
    }
  }
  return visibility;
}

/** Drop answers for hidden and unknown fields. Returns only what should be persisted. */
export function stripHidden(form: FormSchema, answers: AnswerMap): Record<string, unknown> {
  const visibility = computeVisibility(form, answers);
  const kept: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(answers)) {
    if (visibility[id]) kept[id] = value;
  }
  return kept;
}
