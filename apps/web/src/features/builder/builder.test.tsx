import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FormSchema } from "@formit/schema";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { FormRecord } from "../../lib/api.ts";
import { BuilderCanvas } from "./BuilderCanvas.tsx";
import { BuilderHeader } from "./BuilderHeader.tsx";
import { FieldInspector } from "./FieldInspector.tsx";
import { FieldPalette } from "./FieldPalette.tsx";
import { FormSettingsTab } from "./FormSettingsTab.tsx";
import { FormThemeTab } from "./FormThemeTab.tsx";
import { useBuilderState } from "./useBuilderState.ts";

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockSchema: FormSchema = {
  title: "Product Feedback",
  description: "Help us improve our service",
  sections: [
    {
      id: "s_main",
      title: "General Information",
      fields: [
        {
          id: "f_name",
          type: "short_text",
          label: "Your Full Name",
          required: true,
          validation: {},
        },
        {
          id: "f_rating",
          type: "multiple_choice",
          label: "How satisfied are you?",
          required: false,
          options: [
            { id: "opt_1", label: "Very satisfied" },
            { id: "opt_2", label: "Needs improvement" },
          ],
        },
        {
          id: "f_comment",
          type: "long_text",
          label: "What can we improve?",
          required: false,
          validation: {},
          visibleIf: { field: "f_rating", op: "eq", value: "opt_2" },
        },
      ],
    },
  ],
};

const mockFormRecord: FormRecord = {
  id: "form-123",
  ownerId: "user-456",
  slug: "product-feedback",
  title: "Product Feedback",
  schema: mockSchema,
  schemaVersion: 1,
  settings: {
    requireSignIn: false,
    oneResponsePerUser: false,
  },
  status: "open",
  opensAt: null,
  closesAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("Builder - useBuilderState", () => {
  it("initializes with the given form and schema", () => {
    const { result } = renderHook(() => useBuilderState(mockFormRecord));
    expect(result.current.state.schema.title).toBe("Product Feedback");
    expect(result.current.state.form.slug).toBe("product-feedback");
    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(3);
    expect(result.current.state.selectedFieldId).toBe("f_name");
  });

  it("updates title and description", () => {
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    act(() => {
      result.current.actions.updateTitle("Updated Survey Title");
      result.current.actions.updateDescription("Updated description");
    });

    expect(result.current.state.schema.title).toBe("Updated Survey Title");
    expect(result.current.state.schema.description).toBe("Updated description");
  });

  it("adds, duplicates, and deletes fields", () => {
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    // Add field
    act(() => {
      result.current.actions.addField("s_main", "date");
    });
    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(4);
    const added = result.current.state.schema.sections[0]?.fields[3];
    expect(added?.type).toBe("date");

    // Duplicate field
    act(() => {
      result.current.actions.duplicateField("s_main", "f_name");
    });
    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(5);
    const duplicate = result.current.state.schema.sections[0]?.fields[1];
    expect(duplicate?.label).toBe("Your Full Name (Copy)");

    // Delete field
    act(() => {
      result.current.actions.deleteField("s_main", "f_name");
    });
    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(4);

    // Insert question from question bank
    act(() => {
      result.current.actions.insertQuestion("s_main", {
        type: "linear_scale",
        label: "NPS Rating",
        required: false,
        min: 0,
        max: 10,
      });
    });
    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(5);
    const bankInserted = result.current.state.schema.sections[0]?.fields[4];
    expect(bankInserted?.label).toBe("NPS Rating");
    expect(bankInserted?.id).toMatch(/^f_/);
  });

  it("supports undo and redo", () => {
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    expect(result.current.state.canUndo).toBe(false);

    act(() => {
      result.current.actions.updateTitle("First Change");
    });
    expect(result.current.state.schema.title).toBe("First Change");
    expect(result.current.state.canUndo).toBe(true);

    act(() => {
      result.current.actions.updateTitle("Second Change");
    });
    expect(result.current.state.schema.title).toBe("Second Change");

    // Undo
    act(() => {
      result.current.actions.undo();
    });
    expect(result.current.state.schema.title).toBe("First Change");
    expect(result.current.state.canRedo).toBe(true);

    // Redo
    act(() => {
      result.current.actions.redo();
    });
    expect(result.current.state.schema.title).toBe("Second Change");
  });

  it("supports switching tabs", () => {
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    expect(result.current.state.activeTab).toBe("builder");
    act(() => {
      result.current.actions.setActiveTab("settings");
    });
    expect(result.current.state.activeTab).toBe("settings");

    act(() => {
      result.current.actions.setActiveTab("preview");
    });
    expect(result.current.state.activeTab).toBe("preview");
  });

  it("adds and deletes sections", () => {
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    expect(result.current.state.schema.sections).toHaveLength(1);

    act(() => {
      result.current.actions.addSection();
    });
    expect(result.current.state.schema.sections).toHaveLength(2);

    const newSecId = result.current.state.schema.sections[1]!.id;
    act(() => {
      result.current.actions.deleteSection(newSecId);
    });
    expect(result.current.state.schema.sections).toHaveLength(1);
  });
});

describe("Builder - UI Components", () => {
  it("renders BuilderHeader with editable title and tab buttons", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    render(
      <MemoryRouter>
        <BuilderHeader state={result.current.state} actions={result.current.actions} />
      </MemoryRouter>,
    );

    expect(screen.getByDisplayValue("Product Feedback")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();

    const settingsTab = screen.getByRole("button", { name: /settings/i });
    await user.click(settingsTab);
    expect(result.current.state.activeTab).toBe("settings");
  });

  it("renders FieldPalette and allows clicking a field to add it", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    renderWithQuery(<FieldPalette state={result.current.state} actions={result.current.actions} />);

    expect(screen.getByText("Add Questions")).toBeInTheDocument();
    expect(screen.getByText("Short text")).toBeInTheDocument();
    expect(screen.getByText("Rating scale")).toBeInTheDocument();

    const shortTextBtn = screen.getByRole("button", { name: /short text/i });
    await user.click(shortTextBtn);

    expect(result.current.state.schema.sections[0]?.fields.length).toBe(4);
  });

  it("renders BuilderCanvas with question cards and controls", () => {
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    renderWithQuery(<BuilderCanvas state={result.current.state} actions={result.current.actions} />);

    expect(screen.getByDisplayValue("General Information")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Your Full Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("How satisfied are you?")).toBeInTheDocument();
  });

  it("renders FieldInspector when field is selected", () => {
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    // Select the 3rd field: f_comment
    act(() => {
      result.current.actions.selectField("f_comment", "s_main");
    });

    renderWithQuery(<FieldInspector state={result.current.state} actions={result.current.actions} />);

    expect(screen.getByText("Properties")).toBeInTheDocument();
    expect(screen.getByText("f_comment")).toBeInTheDocument();
    expect(screen.getByText("Paragraph Bounds")).toBeInTheDocument();
  });

  it("accurately tracks unsaved changes and displays correct status in header", () => {
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    // Initially clean
    expect(result.current.state.hasUnsavedChanges).toBe(false);

    const { rerender } = render(
      <MemoryRouter>
        <BuilderHeader state={result.current.state} actions={result.current.actions} />
      </MemoryRouter>,
    );

    // Shows Saved when clean
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();

    // User types / updates title
    act(() => {
      result.current.actions.updateTitle("Brand New Title");
    });

    expect(result.current.state.hasUnsavedChanges).toBe(true);

    rerender(
      <MemoryRouter>
        <BuilderHeader state={result.current.state} actions={result.current.actions} />
      </MemoryRouter>,
    );

    // Shows Unsaved changes
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("updates form theme (accentColor, font, darkMode, headerImage)", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    act(() => {
      result.current.actions.updateTheme({
        accentColor: "#059669",
        font: "serif",
        darkMode: "dark",
        headerImage: "https://example.com/cover.jpg",
      });
    });

    expect(result.current.state.schema.theme?.accentColor).toBe("#059669");
    expect(result.current.state.schema.theme?.font).toBe("serif");
    expect(result.current.state.schema.theme?.darkMode).toBe("dark");
    expect(result.current.state.schema.theme?.headerImage).toBe("https://example.com/cover.jpg");
    expect(result.current.state.hasUnsavedChanges).toBe(true);

    // Render FormThemeTab
    render(<FormThemeTab state={result.current.state} actions={result.current.actions} />);

    expect(screen.getByText("Theme & Styling")).toBeInTheDocument();
    expect(screen.getByText("Editorial Serif")).toBeInTheDocument();
    expect(screen.getByText("Dark Mode")).toBeInTheDocument();

    // Click another color preset like Amber
    const amberBtn = screen.getByRole("button", { name: /select amber accent color/i });
    await user.click(amberBtn);
    expect(result.current.state.schema.theme?.accentColor).toBe("#d97706");
  });

  it("updates email notifications and respondent receipt settings in FormSettingsTab", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    // Initially disabled
    expect(result.current.state.form.settings.notifyOwnerOnSubmission).toBeFalsy();
    expect(result.current.state.form.settings.sendRespondentReceipt).toBeFalsy();

    // Verify actions.updateSettings updates settings state correctly
    act(() => {
      result.current.actions.updateSettings({
        notifyOwnerOnSubmission: true,
        notificationEmail: "alerts@company.com",
        sendRespondentReceipt: true,
      });
    });

    expect(result.current.state.form.settings.notifyOwnerOnSubmission).toBe(true);
    expect(result.current.state.form.settings.notificationEmail).toBe("alerts@company.com");
    expect(result.current.state.form.settings.sendRespondentReceipt).toBe(true);

    // Verify rendered FormSettingsTab reflects settings
    render(<FormSettingsTab state={result.current.state} actions={result.current.actions} />);

    expect(screen.getByText("Email Notifications")).toBeInTheDocument();
    const notifyOwnerToggle = screen.getByLabelText(/notify me on every new response/i);
    expect(notifyOwnerToggle).toBeChecked();

    const emailInput = screen.getByPlaceholderText("owner@example.com");
    expect(emailInput).toHaveValue("alerts@company.com");

    const receiptToggle = screen.getByLabelText(/send email receipt to respondent/i);
    expect(receiptToggle).toBeChecked();
  });

  it("configures question image and option shuffling in FieldInspector", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useBuilderState(mockFormRecord));

    // Select the multiple choice question 'f_rating'
    act(() => {
      result.current.actions.selectField("f_rating", "s_main");
    });

    expect(result.current.state.selectedFieldId).toBe("f_rating");

    // Render FieldInspector
    renderWithQuery(<FieldInspector state={result.current.state} actions={result.current.actions} />);

    // Verify Question Image section exists
    expect(screen.getByText("Question Image")).toBeInTheDocument();
    const urlInput = screen.getByPlaceholderText(/Paste image URL/i);
    await user.type(urlInput, "https://example.com/rating-scale.png");

    const applyBtn = screen.getByRole("button", { name: "Apply" });
    await user.click(applyBtn);

    // Verify field updated in builder state
    const currentRatingField = result.current.state.schema.sections[0]?.fields.find(
      (f) => f.id === "f_rating",
    );
    expect(currentRatingField?.imageUrl).toBe("https://example.com/rating-scale.png");

    // Verify Shuffle choices toggle exists and functions
    const shuffleToggle = screen.getByLabelText(/shuffle choices/i);
    expect(shuffleToggle).not.toBeChecked();

    await user.click(shuffleToggle);
    const updatedRatingField = result.current.state.schema.sections[0]?.fields.find(
      (f) => f.id === "f_rating",
    );
    expect(updatedRatingField && "shuffleOptions" in updatedRatingField && updatedRatingField.shuffleOptions).toBe(true);
  });
});


