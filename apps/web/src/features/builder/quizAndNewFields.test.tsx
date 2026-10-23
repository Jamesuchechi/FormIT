import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, renderHook, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Field, FormSchema } from "@formit/schema";
import type { FormRecord, PublicForm } from "../../lib/api.ts";
import { FormFiller } from "../renderer/FormFiller.tsx";
import { MatrixInput } from "../renderer/fields/MatrixField.tsx";
import { RankingInput } from "../renderer/fields/RankingField.tsx";
import { SignatureInput } from "../renderer/fields/SignatureField.tsx";
import { formatAnswer } from "../results/results.ts";
import { FieldInspector } from "./FieldInspector.tsx";
import { FormSettingsTab } from "./FormSettingsTab.tsx";
import { useBuilderState } from "./useBuilderState.ts";

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function createTestForm(schema: FormSchema, settings = {}): FormRecord {
  return {
    id: "form-test-id",
    ownerId: "user-test",
    slug: "test-form",
    title: schema.title,
    schema,
    schemaVersion: 1,
    settings,
    status: "open",
    opensAt: null,
    closesAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("Quiz Mode and New Fields Feature Suite", () => {
  describe("FormSettingsTab - Quiz Mode", () => {
    it("toggles quiz mode and updates settings", async () => {
      const user = userEvent.setup();
      const form = createTestForm({ title: "Form", sections: [] }, {});
      const { result } = renderHook(() => useBuilderState(form));

      renderWithQuery(<FormSettingsTab state={result.current.state} actions={result.current.actions} />);

      const quizToggle = screen.getByLabelText(/Toggle Quiz Mode/i);
      expect(quizToggle).not.toBeChecked();

      await user.click(quizToggle);
      expect(result.current.state.form.settings.quiz?.enabled).toBe(true);
      expect(result.current.state.form.settings.quiz?.scoringMode).toBe("instant");
    });

    it("displays scoring release options when quiz mode is enabled", async () => {
      const user = userEvent.setup();
      const form = createTestForm(
        { title: "Quiz Form", sections: [] },
        {
          quiz: { enabled: true, scoringMode: "instant", showCorrectAnswers: true, showFeedback: true },
        }
      );
      const { result } = renderHook(() => useBuilderState(form));

      renderWithQuery(<FormSettingsTab state={result.current.state} actions={result.current.actions} />);

      expect(screen.getByText("Instant Release")).toBeInTheDocument();
      const deferredBtn = screen.getByRole("button", { name: /Deferred Release/i });
      await user.click(deferredBtn);

      expect(result.current.state.form.settings.quiz?.scoringMode).toBe("deferred");
    });
  });

  describe("FieldInspector - Quiz & New Field Types", () => {
    it("renders Quiz tab and allows setting points, correct answer, and feedback", async () => {
      const user = userEvent.setup();
      const initialSchema: FormSchema = {
        title: "Quiz Form",
        sections: [
          {
            id: "s1",
            title: "Sec 1",
            fields: [
              {
                id: "q1",
                type: "multiple_choice",
                label: "What is 2+2?",
                required: false,
                options: [
                  { id: "opt1", label: "3" },
                  { id: "opt2", label: "4" },
                ],
                quiz: {
                  points: 5,
                  correctAnswer: "opt2",
                  feedback: {
                    correct: "Great job!",
                    incorrect: "Try again!",
                  },
                },
              },
            ],
          },
        ],
      };

      const formRecord = createTestForm(initialSchema, {
        quiz: { enabled: true, scoringMode: "instant" },
      });
      const { result } = renderHook(() => useBuilderState(formRecord));
      act(() => {
        result.current.actions.selectField("q1");
      });

      renderWithQuery(
        <FieldInspector state={result.current.state} actions={result.current.actions} />
      );

      // Switch to Quiz tab
      const quizTab = screen.getByRole("button", { name: /Quiz/i });
      await user.click(quizTab);

      const pointsInput = screen.getByLabelText(/Points for this question/i);
      expect(pointsInput).toHaveValue(5);

      fireEvent.change(pointsInput, { target: { value: "10" } });

      const updatedField = result.current.state.schema.sections[0]?.fields[0];
      expect(updatedField?.quiz?.points).toBe(10);
    });

    it("renders Matrix rows and columns editor in inspector", async () => {
      const matrixField: Field = {
        id: "m1",
        type: "matrix",
        label: "Satisfaction Matrix",
        required: false,
        rows: [
          { id: "r1", label: "Service" },
          { id: "r2", label: "Cleanliness" },
        ],
        columns: [
          { id: "c1", label: "Poor" },
          { id: "c2", label: "Excellent" },
        ],
      };

      const schema: FormSchema = {
        title: "Matrix Form",
        sections: [
          {
            id: "s1",
            title: "Sec 1",
            fields: [matrixField],
          },
        ],
      };

      const formRecord = createTestForm(schema);
      const { result } = renderHook(() => useBuilderState(formRecord));
      act(() => {
        result.current.actions.selectField("m1");
      });

      renderWithQuery(
        <FieldInspector state={result.current.state} actions={result.current.actions} />
      );

      expect(screen.getByText(/Rows \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Columns \(2\)/)).toBeInTheDocument();
      expect(screen.getByDisplayValue("Service")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Cleanliness")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Poor")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Excellent")).toBeInTheDocument();
    });

    it("renders Ranking items editor in inspector", async () => {
      const rankingField: Field = {
        id: "rk1",
        type: "ranking",
        label: "Feature Preferences",
        required: false,
        options: [
          { id: "it1", label: "Speed" },
          { id: "it2", label: "Design" },
          { id: "it3", label: "Price" },
        ],
      };

      const schema: FormSchema = {
        title: "Ranking Form",
        sections: [
          {
            id: "s1",
            title: "Sec 1",
            fields: [rankingField],
          },
        ],
      };

      const formRecord = createTestForm(schema);
      const { result } = renderHook(() => useBuilderState(formRecord));
      act(() => {
        result.current.actions.selectField("rk1");
      });

      renderWithQuery(
        <FieldInspector state={result.current.state} actions={result.current.actions} />
      );

      expect(screen.getByText(/Items to Rank \(3\)/)).toBeInTheDocument();
      expect(screen.getByDisplayValue("Speed")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Design")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Price")).toBeInTheDocument();
    });

    it("renders Signature pen color options in inspector", async () => {
      const sigField: Field = {
        id: "s1",
        type: "signature",
        label: "Agreement Signature",
        required: false,
        penColor: "#0f172a",
      };

      const schema: FormSchema = {
        title: "Signature Form",
        sections: [
          {
            id: "s1",
            title: "Sec 1",
            fields: [sigField],
          },
        ],
      };

      const formRecord = createTestForm(schema);
      const { result } = renderHook(() => useBuilderState(formRecord));
      act(() => {
        result.current.actions.selectField("s1");
      });

      renderWithQuery(
        <FieldInspector state={result.current.state} actions={result.current.actions} />
      );

      expect(screen.getByText("Signature Settings")).toBeInTheDocument();
      expect(screen.getByText("Pen Stroke Color")).toBeInTheDocument();
      expect(screen.getAllByDisplayValue("#0f172a").length).toBeGreaterThan(0);
    });
  });

  describe("Renderer Inputs", () => {
    it("renders MatrixInput and records selection for rows", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const field: Field = {
        id: "mf1",
        type: "matrix",
        label: "Rate services",
        required: false,
        rows: [{ id: "r1", label: "Speed" }],
        columns: [
          { id: "c1", label: "Slow" },
          { id: "c2", label: "Fast" },
        ],
      };

      render(
        <MatrixInput
          field={field}
          value={{}}
          onChange={onChange}
          ctl={{ id: "test-mat", invalid: false }}
        />
      );

      const radioFast = screen.getByLabelText("Speed, Fast");
      await user.click(radioFast);

      expect(onChange).toHaveBeenCalledWith({
        r1: "c2",
      });
    });

    it("renders RankingInput and allows reordering items via up/down buttons", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const field: Field = {
        id: "rf1",
        type: "ranking",
        label: "Rank colors",
        required: false,
        options: [
          { id: "c1", label: "Red" },
          { id: "c2", label: "Blue" },
          { id: "c3", label: "Green" },
        ],
      };

      render(
        <RankingInput
          field={field}
          value={["c1", "c2", "c3"]}
          onChange={onChange}
          ctl={{ id: "test-rk", invalid: false }}
        />
      );

      const moveBlueUp = screen.getByRole("button", { name: 'Move "Blue" up' });
      await user.click(moveBlueUp);

      expect(onChange).toHaveBeenCalledWith(["c2", "c1", "c3"]);
    });

    it("renders SignatureInput with canvas and clear button", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const field: Field = {
        id: "sf1",
        type: "signature",
        label: "Sign here",
        required: false,
        penColor: "#000000",
      };

      render(
        <SignatureInput
          field={field}
          value="data:image/png;base64,mocksignature"
          onChange={onChange}
          ctl={{ id: "test-sig", invalid: false }}
        />
      );

      const clearBtn = screen.getByRole("button", { name: /Clear signature/i });
      expect(clearBtn).toBeInTheDocument();

      await user.click(clearBtn);
      expect(onChange).toHaveBeenCalledWith("");
    });
  });

  describe("FormFiller - Quiz Scoring Submission", () => {
    it("scores quiz answers instantly on submit and displays breakdown", async () => {
      const user = userEvent.setup();
      const schema: FormSchema = {
        title: "Trivia Quiz",
        sections: [
          {
            id: "sec1",
            title: "Round 1",
            fields: [
              {
                id: "q1",
                type: "multiple_choice",
                label: "Capital of France?",
                required: true,
                options: [
                  { id: "opt_p", label: "Paris" },
                  { id: "opt_l", label: "London" },
                ],
                quiz: {
                  points: 10,
                  correctAnswer: "opt_p",
                  feedback: {
                    correct: "Bien joué! Paris is the capital.",
                    incorrect: "Incorrect, Paris is the capital.",
                  },
                },
              },
            ],
          },
        ],
      };

      const publicForm: PublicForm = {
        id: "form-quiz-1",
        slug: "trivia-quiz",
        title: "Trivia Quiz",
        schema,
        schemaVersion: 1,
        requireSignIn: false,
        confirmationMessage: "Thanks for taking the quiz!",
        settings: {
          quiz: {
            enabled: true,
            scoringMode: "instant",
            showCorrectAnswers: true,
            showFeedback: true,
          },
        },
      };

      const api = {
        submit: vi.fn().mockResolvedValue({ id: "resp-1", answers: { q1: "opt_p" } }),
        upload: vi.fn(),
      };

      render(<FormFiller form={publicForm} api={api} />);

      // Select correct answer
      const parisOption = screen.getByLabelText("Paris");
      await user.click(parisOption);

      // Submit form
      const submitBtn = screen.getByRole("button", { name: "Submit" });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Quiz Result")).toBeInTheDocument();
      });

      expect(screen.getByText("100% Score")).toBeInTheDocument();
      expect(screen.getByText(/✓ Correct/i)).toBeInTheDocument();
      expect(screen.getByText(/10 \/ 10 pts/i)).toBeInTheDocument();
      expect(screen.getByText(/Bien joué! Paris is the capital./i)).toBeInTheDocument();
    });
  });

  describe("Results formatting", () => {
    it("formats matrix, ranking, and signature answers accurately", () => {
      const matrixField: Field = {
        id: "m1",
        type: "matrix",
        label: "Matrix",
        required: false,
        rows: [
          { id: "r1", label: "Quality" },
          { id: "r2", label: "Value" },
        ],
        columns: [
          { id: "c1", label: "Low" },
          { id: "c2", label: "High" },
        ],
      };

      const matrixText = formatAnswer(matrixField, { r1: "c2", r2: "c1" });
      expect(matrixText).toBe("Quality: High; Value: Low");

      const rankingField: Field = {
        id: "rk1",
        type: "ranking",
        label: "Ranking",
        required: false,
        options: [
          { id: "i1", label: "Feature A" },
          { id: "i2", label: "Feature B" },
        ],
      };

      const rankingText = formatAnswer(rankingField, ["i2", "i1"]);
      expect(rankingText).toBe("1. Feature B, 2. Feature A");

      const sigField: Field = {
        id: "s1",
        type: "signature",
        label: "Sign",
        required: false,
      };

      const sigText = formatAnswer(sigField, "data:image/png;base64,data");
      expect(sigText).toBe("[Signature]");
    });
  });
});
