import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImportOptionsModal, parseOptionsText } from "./ImportOptionsModal.tsx";

describe("parseOptionsText", () => {
  it("parses single lines properly", () => {
    const raw = `Option A\nOption B\nOption C`;
    expect(parseOptionsText(raw)).toEqual(["Option A", "Option B", "Option C"]);
  });

  it("parses comma-separated values and respects quotes", () => {
    const raw = `Red, Green, "Blue, Cyan", Yellow`;
    expect(parseOptionsText(raw)).toEqual(["Red", "Green", "Blue, Cyan", "Yellow"]);
  });

  it("parses tab-separated values from spreadsheets", () => {
    const raw = `First\tSecond\tThird`;
    expect(parseOptionsText(raw)).toEqual(["First", "Second", "Third"]);
  });

  it("ignores blank lines and whitespace", () => {
    const raw = `\n  Option 1  \n\n\n   Option 2   \n`;
    expect(parseOptionsText(raw)).toEqual(["Option 1", "Option 2"]);
  });
});

describe("ImportOptionsModal component", () => {
  const initialOptions = [
    { id: "opt_1", label: "Existing 1" },
    { id: "opt_2", label: "Existing 2" },
  ];

  it("does not render when closed", () => {
    render(
      <ImportOptionsModal
        isOpen={false}
        onClose={vi.fn()}
        currentOptions={initialOptions}
        onImport={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Import \/ Bulk Add Options/i)).toBeNull();
  });

  it("renders when open and imports options replacing existing", () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(
      <ImportOptionsModal
        isOpen={true}
        onClose={onClose}
        currentOptions={initialOptions}
        onImport={onImport}
      />,
    );

    expect(screen.getByText(/Import \/ Bulk Add Options/i)).toBeDefined();

    const textarea = screen.getByPlaceholderText(/United States/i);
    fireEvent.change(textarea, { target: { value: "Apple\nBanana\nCherry" } });

    expect(screen.getByText("3 options detected")).toBeDefined();

    const importBtn = screen.getByRole("button", { name: /Import 3 Options/i });
    fireEvent.click(importBtn);

    expect(onImport).toHaveBeenCalledWith([
      expect.objectContaining({ label: "Apple" }),
      expect.objectContaining({ label: "Banana" }),
      expect.objectContaining({ label: "Cherry" }),
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it("appends to existing options when append mode is selected", () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(
      <ImportOptionsModal
        isOpen={true}
        onClose={onClose}
        currentOptions={initialOptions}
        onImport={onImport}
      />,
    );

    const textarea = screen.getByPlaceholderText(/United States/i);
    fireEvent.change(textarea, { target: { value: "Extra 1\nExtra 2" } });

    const appendRadio = screen.getByLabelText(/Append to existing/i);
    fireEvent.click(appendRadio);

    const importBtn = screen.getByRole("button", { name: /Import 2 Options/i });
    fireEvent.click(importBtn);

    expect(onImport).toHaveBeenCalledWith([
      { id: "opt_1", label: "Existing 1" },
      { id: "opt_2", label: "Existing 2" },
      expect.objectContaining({ label: "Extra 1" }),
      expect.objectContaining({ label: "Extra 2" }),
    ]);
  });
});

describe("documentTextExtractor", () => {
  it("extracts text from plain text and csv files", async () => {
    const { extractTextFromFile } = await import("./documentTextExtractor.ts");
    const file = new File(["Option 1\nOption 2"], "options.csv", { type: "text/csv" });
    const content = await extractTextFromFile(file);
    expect(content).toBe("Option 1\nOption 2");
  });
});
