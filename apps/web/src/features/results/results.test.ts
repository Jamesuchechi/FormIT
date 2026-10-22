import { describe, expect, it } from "vitest";
import type { FormSchema } from "@formit/schema";
import {
  buildColumns,
  csvCell,
  csvHeader,
  formatResponseAnswer,
  responseToCsvRow,
  summarize,
  type ResponseRow,
} from "./results.ts";
import { buildCsvBlob } from "./exportCsv.ts";

const v1: FormSchema = {
  title: "T",
  sections: [
    {
      id: "s1",
      fields: [
        {
          id: "color",
          type: "multiple_choice",
          label: "Color",
          required: false,
          options: [
            { id: "r", label: "Red" },
            { id: "b", label: "Blue" },
          ],
        },
        { id: "old", type: "short_text", label: "Old question", required: false, validation: {} },
      ],
    },
  ],
};

const v2: FormSchema = {
  title: "T",
  sections: [
    {
      id: "s1",
      fields: [
        {
          id: "color",
          type: "multiple_choice",
          label: "Favourite colour",
          required: false,
          options: [
            { id: "r", label: "Crimson" },
            { id: "b", label: "Blue" },
          ],
        },
        { id: "rate", type: "linear_scale", label: "Rate", required: false, min: 1, max: 3 },
      ],
    },
  ],
};

const versions = { 1: v1, 2: v2 };

const resp = (over: Partial<ResponseRow>): ResponseRow => ({
  id: "x",
  respondentId: null,
  schemaVersion: 2,
  answers: {},
  submittedAt: "2026-01-01T00:00:00Z",
  ...over,
});

describe("results helpers", () => {
  it("builds columns from current schema then older-only fields", () => {
    const cols = buildColumns(v2, versions);
    expect(cols.map((c) => c.id)).toEqual(["color", "rate", "old"]);
    expect(cols[0]!.label).toBe("Favourite colour");
  });

  it("renders old responses against their own version's labels", () => {
    const cols = buildColumns(v2, versions);
    const old = resp({ schemaVersion: 1, answers: { color: "r" } });
    const cur = resp({ schemaVersion: 2, answers: { color: "r" } });
    expect(formatResponseAnswer(old, cols[0]!, versions)).toBe("Red");
    expect(formatResponseAnswer(cur, cols[0]!, versions)).toBe("Crimson");
  });

  it("summarizes choices, scales and text", () => {
    const cols = buildColumns(v2, versions);
    const rows = [
      resp({ id: "1", answers: { color: "r", rate: 3 } }),
      resp({ id: "2", answers: { color: "r", rate: 1 } }),
      resp({ id: "3", schemaVersion: 1, answers: { color: "b", old: "hello" } }),
    ];
    const [color, rate, old] = summarize(cols, rows, versions);
    expect(color).toMatchObject({ kind: "choice", answered: 3 });
    if (color?.kind !== "choice") throw new Error("expected choice");
    expect(color.bars.find((b) => b.id === "r")?.count).toBe(2);
    if (rate?.kind !== "scale") throw new Error("expected scale");
    expect(rate.average).toBe(2);
    expect(rate.bars.map((b) => b.count)).toEqual([1, 0, 1]);
    expect(old).toMatchObject({ kind: "text", values: ["hello"] });
  });

  it("escapes CSV and neutralizes formulas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("plain")).toBe("plain");
  });

  it("exports header and rows across batches", async () => {
    const cols = buildColumns(v2, versions);
    async function* batches() {
      yield [resp({ id: "1", answers: { color: "r" } })];
      yield [resp({ id: "2", answers: { color: "b", rate: 2 } })];
    }
    const blob = await buildCsvBlob(batches(), cols, versions);
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    const text = raw.replace("\uFEFF", "");
    expect(text.startsWith(csvHeader(cols))).toBe(true);
    expect(text).toContain(
      responseToCsvRow(resp({ id: "2", answers: { color: "b", rate: 2 } }), cols, versions),
    );
    expect(text.trim().split("\r\n")).toHaveLength(3);
  });

  it("formats and summarizes Other choice answers correctly", () => {
    const cols = buildColumns(v2, versions);
    const otherRow = resp({
      schemaVersion: 2,
      answers: { color: { other: "Emerald Green" } },
    });
    expect(formatResponseAnswer(otherRow, cols[0]!, versions)).toBe("Other: Emerald Green");

    const [color] = summarize(cols, [otherRow], versions);
    expect(color).toMatchObject({ kind: "choice", answered: 1 });
    if (color?.kind !== "choice") throw new Error("expected choice");
    const otherBar = color.bars.find((b) => b.id === "__other__");
    expect(otherBar).toBeDefined();
    expect(otherBar?.count).toBe(1);
    expect(otherBar?.label).toBe("Other");
  });
});
