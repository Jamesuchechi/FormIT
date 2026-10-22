import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { instantiateQuestion, type SavedQuestion } from "./questionBankApi.ts";
import { QuestionBankModal } from "./QuestionBankModal.tsx";
import { QUESTION_PRESETS } from "./questionPresets.ts";
import { SaveQuestionModal } from "./SaveQuestionModal.tsx";

// Mock supabase client
vi.mock("../../lib/supabase.ts", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user_test_1" } }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "sq_1",
            owner_id: "user_test_1",
            title: "Custom Dietary Requirements",
            category: "General",
            field_definition: {
              type: "multiple_choice",
              label: "Any dietary requirements?",
              options: [
                { id: "opt_veg", label: "Vegetarian" },
                { id: "opt_vegan", label: "Vegan" },
              ],
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "sq_new",
              owner_id: "user_test_1",
              title: "New Saved Question",
              category: "General",
              field_definition: { type: "short_text", label: "New Saved Question" },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Question Bank - Presets & Instantiation", () => {
  it("contains rich presets across multiple categories", () => {
    expect(QUESTION_PRESETS.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(QUESTION_PRESETS.map((p) => p.category));
    expect(categories.has("Contact Info")).toBe(true);
    expect(categories.has("Feedback & Ratings")).toBe(true);
    expect(categories.has("Choice & Selection")).toBe(true);
    expect(categories.has("Files & Media")).toBe(true);
  });

  it("instantiateQuestion assigns unique field IDs and regenerates option IDs", () => {
    const template = QUESTION_PRESETS.find((p) => p.field.type === "multiple_choice")!.field;
    const instance1 = instantiateQuestion(template);
    const instance2 = instantiateQuestion(template);

    expect(instance1.id).toMatch(/^f_/);
    expect(instance2.id).toMatch(/^f_/);
    expect(instance1.id).not.toBe(instance2.id);

    // Option IDs must also be freshly generated and distinct
    if ("options" in instance1 && "options" in instance2) {
      expect(instance1.options[0]?.id).toMatch(/^opt_/);
      expect(instance2.options[0]?.id).toMatch(/^opt_/);
      expect(instance1.options[0]?.id).not.toBe(instance2.options[0]?.id);
    }
  });
});

describe("SaveQuestionModal", () => {
  it("renders with field details and allows saving to Question Bank", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <SaveQuestionModal
        isOpen={true}
        field={{
          id: "f_curr",
          type: "linear_scale",
          label: "How would you rate this workshop?",
          required: true,
          min: 1,
          max: 10,
        }}
        onClose={onClose}
        onSaved={onSaved}
      />,
    );

    expect(screen.getByText("Save to Question Bank")).toBeInTheDocument();
    expect(screen.getByDisplayValue("How would you rate this workshop?")).toBeInTheDocument();
    expect(screen.getByText("linear scale")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /save question/i });
    await user.click(saveBtn);

    expect(await screen.findByText("Saved to Question Bank!")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalled();
  });
});

describe("QuestionBankModal", () => {
  it("renders both presets and custom saved questions", async () => {
    const onInsert = vi.fn();
    const onClose = vi.fn();

    renderWithClient(
      <QuestionBankModal isOpen={true} onClose={onClose} onInsertQuestion={onInsert} />,
    );

    expect(await screen.findByText("Custom Dietary Requirements")).toBeInTheDocument();
    expect(screen.getByText("Net Promoter Score (NPS 0-10)")).toBeInTheDocument();
    expect(screen.getByText("Email Address")).toBeInTheDocument();
  });

  it("filters questions by search query", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <QuestionBankModal isOpen={true} onClose={vi.fn()} onInsertQuestion={vi.fn()} />,
    );

    const searchInput = screen.getByPlaceholderText(/search questions/i);
    await user.type(searchInput, "Dietary");

    expect(screen.getByText("Custom Dietary Requirements")).toBeInTheDocument();
    expect(screen.queryByText("Net Promoter Score (NPS 0-10)")).not.toBeInTheDocument();
  });

  it("inserts question and closes modal when insert is clicked", async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    const onClose = vi.fn();

    renderWithClient(
      <QuestionBankModal isOpen={true} onClose={onClose} onInsertQuestion={onInsert} />,
    );

    const insertButtons = await screen.findAllByRole("button", { name: /insert question/i });
    await user.click(insertButtons[0]!);

    expect(onInsert).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
