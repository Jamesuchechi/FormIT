import { describe, expect, it } from "vitest";
import {
  checkIntegrity,
  computeCalculatedFields,
  computeVisibility,
  evaluateFormula,
  extractFormulaVariables,
  getReachableSectionIds,
  validateFormulaSyntax,
  validateSubmission,
  type FormSchema,
} from "../src/index.ts";

describe("evaluateFormula and extractFormulaVariables", () => {
  it("evaluates basic arithmetic and respect operator precedence", () => {
    expect(evaluateFormula("2 + 3 * 4", {})).toBe(14);
    expect(evaluateFormula("(2 + 3) * 4", {})).toBe(20);
    expect(evaluateFormula("10 - 4 - 2", {})).toBe(4);
    expect(evaluateFormula("2 ^ 3", {})).toBe(8);
    expect(evaluateFormula("15 % 4", {})).toBe(3);
  });

  it("handles unary minus and plus", () => {
    expect(evaluateFormula("-5 + 10", {})).toBe(5);
    expect(evaluateFormula("-(3 + 2)", {})).toBe(-5);
  });

  it("evaluates functions: SUM, AVG, MIN, MAX, ROUND, ABS, IF", () => {
    expect(evaluateFormula("SUM(1, 2, 3, 4)", {})).toBe(10);
    expect(evaluateFormula("AVG(10, 20, 30)", {})).toBe(20);
    expect(evaluateFormula("MIN(5, 2, 9)", {})).toBe(2);
    expect(evaluateFormula("MAX(5, 2, 9)", {})).toBe(9);
    expect(evaluateFormula("ROUND(10 / 3, 2)", {})).toBe(3.33);
    expect(evaluateFormula("ABS(-42)", {})).toBe(42);
    expect(evaluateFormula("IF(1, 100, 200)", {})).toBe(100);
    expect(evaluateFormula("IF(0, 100, 200)", {})).toBe(200);
  });

  it("resolves answers and variable identifiers", () => {
    expect(evaluateFormula("qty * price", { qty: 4, price: 25 })).toBe(100);
    expect(evaluateFormula("{f_qty} * {f_price}", { f_qty: "3", f_price: "10.5" })).toBe(31.5);
    expect(evaluateFormula("unanswered + 5", {})).toBe(5); // unanswered defaults to 0
  });

  it("handles division by zero without crashing", () => {
    expect(evaluateFormula("10 / 0", {})).toBe(0);
  });

  it("extracts variable names ignoring function names", () => {
    expect(extractFormulaVariables("SUM(f_a, f_b) * price + {tax}")).toEqual([
      "f_a",
      "f_b",
      "price",
      "tax",
    ]);
  });

  it("validates formula syntax", () => {
    expect(validateFormulaSyntax("a + b * 2").valid).toBe(true);
    expect(validateFormulaSyntax("a + * 2").valid).toBe(false);
    expect(validateFormulaSyntax("").valid).toBe(false);
  });
});

describe("Section branching & getReachableSectionIds", () => {
  const multiSectionForm: FormSchema = {
    title: "Branching Test",
    sections: [
      {
        id: "sec_1",
        title: "Section 1",
        fields: [
          {
            id: "choice",
            type: "multiple_choice",
            label: "Where to go?",
            required: true,
            options: [
              { id: "opt_sec2", label: "Go to Section 2" },
              { id: "opt_sec3", label: "Skip to Section 3", goToSection: "sec_3" },
              { id: "opt_finish", label: "Submit directly", goToSection: "__submit__" },
            ],
          },
        ],
      },
      {
        id: "sec_2",
        title: "Section 2",
        fields: [
          {
            id: "sec2_req",
            type: "short_text",
            label: "Section 2 required question",
            required: true,
            validation: {},
          },
        ],
      },
      {
        id: "sec_3",
        title: "Section 3",
        fields: [
          {
            id: "sec3_req",
            type: "short_text",
            label: "Section 3 required question",
            required: true,
            validation: {},
          },
        ],
      },
    ],
  };

  it("traverses linearly if no branching option is chosen", () => {
    const reachable = getReachableSectionIds(multiSectionForm, { choice: "opt_sec2" });
    expect(Array.from(reachable)).toEqual(["sec_1", "sec_2", "sec_3"]);
  });

  it("skips section 2 when opt_sec3 is selected", () => {
    const reachable = getReachableSectionIds(multiSectionForm, { choice: "opt_sec3" });
    expect(reachable.has("sec_1")).toBe(true);
    expect(reachable.has("sec_2")).toBe(false);
    expect(reachable.has("sec_3")).toBe(true);
  });

  it("stops at section 1 when opt_finish is selected", () => {
    const reachable = getReachableSectionIds(multiSectionForm, { choice: "opt_finish" });
    expect(Array.from(reachable)).toEqual(["sec_1"]);
  });

  it("hides fields in bypassed sections during computeVisibility", () => {
    const visibility = computeVisibility(multiSectionForm, { choice: "opt_sec3" });
    expect(visibility.choice).toBe(true);
    expect(visibility.sec2_req).toBe(false);
    expect(visibility.sec3_req).toBe(true);
  });

  it("allows submission when required questions in skipped sections are unanswered", () => {
    const r = validateSubmission(multiSectionForm, {
      choice: "opt_sec3",
      sec3_req: "Answered for sec 3",
    });
    expect(r.success).toBe(true);
  });

  it("supports section-level afterSection default routing", () => {
    const formWithAfter: FormSchema = {
      ...multiSectionForm,
      sections: [
        {
          ...multiSectionForm.sections[0]!,
          afterSection: "sec_3",
          fields: [
            {
              id: "text1",
              type: "short_text",
              label: "Question 1",
              required: false,
              validation: {},
            },
          ],
        },
        multiSectionForm.sections[1]!,
        multiSectionForm.sections[2]!,
      ],
    };
    const reachable = getReachableSectionIds(formWithAfter, {});
    expect(reachable.has("sec_2")).toBe(false);
    expect(reachable.has("sec_3")).toBe(true);
  });
});

describe("Calculated & Hidden fields end-to-end", () => {
  const calcForm: FormSchema = {
    title: "Calculated Form",
    sections: [
      {
        id: "sec_1",
        fields: [
          {
            id: "price",
            type: "short_text",
            label: "Price",
            required: true,
            validation: { format: "number" },
          },
          {
            id: "qty",
            type: "linear_scale",
            label: "Quantity",
            required: true,
            min: 1,
            max: 10,
          },
          {
            id: "total",
            type: "calculated",
            label: "Total Amount",
            required: false,
            calculation: {
              expression: "price * qty",
              prefix: "$",
              suffix: " USD",
              decimals: 2,
            },
          },
          {
            id: "vip_discount",
            type: "short_text",
            label: "VIP Discount Code",
            required: false,
            visibleIf: { field: "total", op: "gte", value: 100 },
            validation: {},
          },
          {
            id: "utm_source",
            type: "hidden",
            label: "UTM Source",
            required: false,
            defaultValue: "direct",
          },
        ],
      },
    ],
  };

  it("computes calculated field values and makes them available for logic rules", () => {
    const calcs = computeCalculatedFields(calcForm, { price: "25", qty: 5 });
    expect(calcs.total).toBe(125);

    // Rule checks total >= 100 -> should show vip_discount
    const visOver100 = computeVisibility(calcForm, { price: "25", qty: 5 });
    expect(visOver100.vip_discount).toBe(true);

    // Total < 100 -> hides vip_discount
    const visUnder100 = computeVisibility(calcForm, { price: "10", qty: 5 });
    expect(visUnder100.vip_discount).toBe(false);
  });

  it("validates submission with calculated and hidden fields", () => {
    const res = validateSubmission(calcForm, {
      price: "30",
      qty: 2,
      utm_source: "google_ads",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.total).toBe(60);
      expect(res.data.utm_source).toBe("google_ads");
    }
  });

  it("integrity checks catch formula referencing forward or unknown fields", () => {
    const badForm: FormSchema = {
      title: "Bad Form",
      sections: [
        {
          id: "s1",
          fields: [
            {
              id: "calc1",
              type: "calculated",
              label: "Calc",
              required: false,
              calculation: { expression: "future_field * 2" },
            },
            {
              id: "future_field",
              type: "short_text",
              label: "Future",
              required: false,
              validation: {},
            },
          ],
        },
      ],
    };
    const issues = checkIntegrity(badForm);
    expect(issues.some((i) => i.code === "invalid_formula")).toBe(true);
  });

  it("integrity checks catch invalid branch section target", () => {
    const badBranch: FormSchema = {
      title: "Bad Branch",
      sections: [
        {
          id: "s1",
          fields: [
            {
              id: "c",
              type: "multiple_choice",
              label: "Choice",
              required: false,
              options: [{ id: "o1", label: "Option 1", goToSection: "non_existent_section" }],
            },
          ],
        },
      ],
    };
    const issues = checkIntegrity(badBranch);
    expect(issues.some((i) => i.code === "rule_unknown_section")).toBe(true);
  });
});
