import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FillApi, PublicForm } from "../../lib/api.ts";
import { FormFiller } from "./FormFiller.tsx";

const mockApi = (): FillApi => ({
  submit: vi.fn().mockResolvedValue({ status: "success" }),
  upload: vi.fn(),
});

const makeForm = (over: Partial<PublicForm> = {}): PublicForm => ({
  id: "form-1",
  slug: "my-form",
  title: "Survey",
  schema: { title: "Survey", sections: [] },
  schemaVersion: 1,
  requireSignIn: false,
  confirmationMessage: null,
  ...over,
});

describe("Section Branching in FormFiller", () => {
  const branchingForm = makeForm({
    id: "f_branch",
    slug: "branch-test",
    title: "Branching Experience",
    schemaVersion: 1,
    schema: {
      title: "Branching Experience",
      sections: [
        {
          id: "sec_welcome",
          title: "Welcome Section",
          fields: [
            {
              id: "destination",
              type: "multiple_choice",
              label: "Choose your path",
              required: true,
              options: [
                { id: "opt_sec2", label: "Path A (Section 2)" },
                { id: "opt_sec3", label: "Path B (Section 3)", goToSection: "sec_feedback" },
                { id: "opt_exit", label: "Exit directly", goToSection: "__submit__" },
              ],
            },
          ],
        },
        {
          id: "sec_details",
          title: "Section 2 Details",
          fields: [
            {
              id: "details_text",
              type: "short_text",
              label: "Tell us more for Path A",
              required: true,
              validation: {},
            },
          ],
        },
        {
          id: "sec_feedback",
          title: "Section 3 Feedback",
          fields: [
            {
              id: "feedback_text",
              type: "short_text",
              label: "Feedback for Path B",
              required: true,
              validation: {},
            },
          ],
        },
      ],
    },
  });

  it("branches to Section 3 skipping Section 2 when Path B is selected", async () => {
    const api = mockApi();
    render(<FormFiller form={branchingForm} api={api} />);

    // Section 1 is visible
    expect(screen.getByText("Welcome Section")).toBeInTheDocument();
    const user = userEvent.setup();

    // Select Path B
    await user.click(screen.getByLabelText(/path b/i));
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Now Section 3 should be shown directly, NOT Section 2
    expect(screen.queryByText("Section 2 Details")).not.toBeInTheDocument();
    expect(screen.getByText("Section 3 Feedback")).toBeInTheDocument();

    // Fill Section 3 and submit
    await user.type(screen.getByLabelText(/feedback for path b/i), "Great work!");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(api.submit).toHaveBeenCalledWith(
        "branch-test",
        { destination: "opt_sec3", feedback_text: "Great work!" },
      );
    });
  });

  it("submits directly when an option with goToSection: '__submit__' is chosen", async () => {
    const api = mockApi();
    render(<FormFiller form={branchingForm} api={api} />);

    const user = userEvent.setup();
    // Select Exit directly
    await user.click(screen.getByLabelText(/exit directly/i));

    // Button text should now say "Submit" instead of "Next" because this branch terminates here
    const submitBtn = screen.getByRole("button", { name: /submit/i });
    expect(submitBtn).toBeInTheDocument();

    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.submit).toHaveBeenCalledWith(
        "branch-test",
        { destination: "opt_exit" },
      );
    });
  });
});

describe("URL Params Prefill and Hidden Fields in FormFiller", () => {
  const prefillForm = makeForm({
    id: "f_prefill",
    slug: "prefill-test",
    title: "Prefill Test",
    schemaVersion: 1,
    schema: {
      title: "Prefill Test",
      sections: [
        {
          id: "sec_1",
          fields: [
            {
              id: "utm_source",
              type: "hidden",
              label: "UTM Source",
              required: false,
              defaultValue: "organic",
            },
            {
              id: "full_name",
              type: "short_text",
              label: "Full Name",
              required: false,
              validation: {},
            },
          ],
        },
      ],
    },
  });

  it("prefills answers from URL query parameters and hidden field default value", async () => {
    // Mock URL search with history.pushState
    window.history.pushState({}, "", "/form/prefill-test?utm_source=newsletter&full_name=Grace");

    const api = mockApi();
    render(<FormFiller form={prefillForm} api={api} />);

    // full_name input should be prefilled with "Grace"
    const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Grace");

    // Hidden field should not render a visible card
    expect(screen.queryByText("UTM Source")).not.toBeInTheDocument();

    // Submit form and verify both URL prefill and hidden answer are submitted
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(api.submit).toHaveBeenCalledWith(
        "prefill-test",
        { utm_source: "newsletter", full_name: "Grace" },
      );
    });

    // Reset URL
    window.history.pushState({}, "", "/");
  });
});

describe("Calculated Fields in FormFiller", () => {
  const calculatedForm = makeForm({
    id: "f_calc",
    slug: "calc-test",
    title: "Calculated Field Experience",
    schemaVersion: 1,
    schema: {
      title: "Calculated Field Experience",
      sections: [
        {
          id: "sec_1",
          fields: [
            {
              id: "unit_price",
              type: "short_text",
              label: "Unit Price",
              required: true,
              validation: { format: "number" },
            },
            {
              id: "quantity",
              type: "linear_scale",
              label: "Quantity",
              required: true,
              min: 1,
              max: 5,
            },
            {
              id: "grand_total",
              type: "calculated",
              label: "Grand Total",
              required: false,
              calculation: {
                expression: "unit_price * quantity",
                prefix: "$",
                suffix: " USD",
                decimals: 2,
              },
            },
          ],
        },
      ],
    },
  });

  it("calculates values in real time and submits calculated result", async () => {
    const api = mockApi();
    render(<FormFiller form={calculatedForm} api={api} />);

    const user = userEvent.setup();

    // Fill unit price: 40
    const priceInput = screen.getByLabelText(/unit price/i);
    await user.type(priceInput, "40");

    // Click linear scale 3
    await user.click(screen.getByRole("radio", { name: "3" }));

    // Grand total should compute 40 * 3 = 120.00
    await waitFor(() => {
      expect(screen.getByText("120.00")).toBeInTheDocument();
    });

    // Submit and ensure calculated value is transmitted
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(api.submit).toHaveBeenCalledWith(
        "calc-test",
        { unit_price: "40", quantity: 3, grand_total: 120 },
      );
    });
  });
});
