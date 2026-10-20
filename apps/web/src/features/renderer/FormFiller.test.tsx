import type { FormSchema } from "@formit/schema";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FillApi, PublicForm } from "../../lib/api.ts";
import { ApiError } from "../../lib/errors.ts";
import { FormFiller } from "./FormFiller.tsx";

const schema: FormSchema = {
  title: "Survey",
  sections: [
    {
      id: "s1",
      title: "About you",
      fields: [
        { id: "name", type: "short_text", label: "Name", required: true, validation: {} },
        {
          id: "role",
          type: "dropdown",
          label: "Role",
          required: true,
          options: [
            { id: "dev", label: "Developer" },
            { id: "other", label: "Other" },
          ],
        },
        {
          id: "other_role",
          type: "short_text",
          label: "Which role",
          required: true,
          validation: {},
          visibleIf: { field: "role", op: "eq", value: "other" },
        },
      ],
    },
    {
      id: "s2",
      title: "Feedback",
      fields: [
        { id: "feedback", type: "long_text", label: "Feedback", required: false, validation: {} },
      ],
    },
  ],
};

const makeForm = (over: Partial<PublicForm> = {}): PublicForm => ({
  id: "form-1",
  slug: "my-form",
  title: "Survey",
  schema,
  schemaVersion: 1,
  requireSignIn: false,
  confirmationMessage: null,
  ...over,
});

function setup(over: Partial<PublicForm> = {}, api?: Partial<FillApi>) {
  const fullApi = {
    submit: vi.fn().mockResolvedValue({ ok: true, id: "r1", confirmation_message: "Thanks!" }),
    upload: vi.fn(),
    ...api,
  } as unknown as FillApi & { submit: ReturnType<typeof vi.fn>; upload: ReturnType<typeof vi.fn> };
  const user = userEvent.setup();
  render(<FormFiller form={makeForm(over)} api={fullApi} />);
  return { api: fullApi, user };
}

describe("FormFiller", () => {
  it("shows conditional fields only when their rule is satisfied", async () => {
    const { user } = setup();
    expect(screen.queryByLabelText(/^Which role/)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^Role/), "other");
    expect(screen.getByLabelText(/^Which role/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^Role/), "dev");
    expect(screen.queryByLabelText(/^Which role/)).not.toBeInTheDocument();
  });

  it("blocks Next on required errors and stays on the page", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findAllByText("This field is required")).toHaveLength(2);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("clears a field's error as soon as it is edited", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findAllByText("This field is required");

    await user.type(screen.getByLabelText(/^Name/), "J");
    expect(screen.getAllByText("This field is required")).toHaveLength(1);
  });

  it("completes the flow, submits normalized answers, and shows the confirmation", async () => {
    const { api, user } = setup();
    await user.type(screen.getByLabelText(/^Name/), "  James ");
    await user.selectOptions(screen.getByLabelText(/^Role/), "dev");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Feedback/), "Great");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Thanks!")).toBeInTheDocument();
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(api.submit).toHaveBeenCalledWith("my-form", {
      name: "James",
      role: "dev",
      feedback: "Great",
    });
  });

  it("does not submit answers for fields that became hidden", async () => {
    const { api, user } = setup();
    await user.type(screen.getByLabelText(/^Name/), "James");
    await user.selectOptions(screen.getByLabelText(/^Role/), "other");
    await user.type(screen.getByLabelText(/^Which role/), "Designer");
    await user.selectOptions(screen.getByLabelText(/^Role/), "dev");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(api.submit).toHaveBeenCalled());
    expect(api.submit.mock.calls[0]![1]).toEqual({ name: "James", role: "dev" });
  });

  it("skips sections whose questions are all hidden", async () => {
    const hiddenSchema: FormSchema = {
      title: "Skip",
      sections: [
        {
          id: "a",
          fields: [
            {
              id: "go",
              type: "multiple_choice",
              label: "Continue?",
              required: true,
              options: [
                { id: "yes", label: "Yes" },
                { id: "no", label: "No" },
              ],
            },
          ],
        },
        {
          id: "b",
          fields: [
            {
              id: "why",
              type: "short_text",
              label: "Why?",
              required: true,
              validation: {},
              visibleIf: { field: "go", op: "eq", value: "yes" },
            },
          ],
        },
      ],
    };
    const { api, user } = setup({ schema: hiddenSchema });

    // Only one visible section: no pagination, button is Submit straight away.
    expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("No"));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(api.submit).toHaveBeenCalledWith("my-form", { go: "no" }));
  });

  it("restores a saved draft and ignores ids that no longer exist", async () => {
    localStorage.setItem("formit:draft:my-form:v1", JSON.stringify({ name: "Saved", ghost: "x" }));
    const { api, user } = setup();
    expect(screen.getByLabelText(/^Name/)).toHaveValue("Saved");

    await user.selectOptions(screen.getByLabelText(/^Role/), "dev");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(api.submit).toHaveBeenCalled());
    expect(api.submit.mock.calls[0]![1]).toEqual({ name: "Saved", role: "dev" });
  });

  it("autosaves drafts and clears them after a successful submit", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/^Name/), "James");
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("formit:draft:my-form:v1") ?? "{}")).toEqual({
        name: "James",
      }),
    );

    await user.selectOptions(screen.getByLabelText(/^Role/), "dev");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Thanks!");
    expect(localStorage.getItem("formit:draft:my-form:v1")).toBeNull();
  });

  it("maps server validation errors onto fields and jumps to the right page", async () => {
    const submit = vi
      .fn()
      .mockRejectedValue(new ApiError("validation_failed", 422, { name: ["Already taken"] }));
    const { user } = setup({}, { submit });
    await user.type(screen.getByLabelText(/^Name/), "James");
    await user.selectOptions(screen.getByLabelText(/^Role/), "dev");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Already taken")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("shows a readable message for API failures and allows retry", async () => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("form_closed", 403))
      .mockResolvedValueOnce({ ok: true, id: "r", confirmation_message: "Thanks!" });
    const { user } = setup({}, { submit });
    await user.type(screen.getByLabelText(/^Name/), "James");
    await user.selectOptions(screen.getByLabelText(/^Role/), "dev");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("no longer accepting responses");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByText("Thanks!")).toBeInTheDocument();
  });

  it("uses the form's confirmation message when the API returns none", async () => {
    const submit = vi.fn().mockResolvedValue({ ok: true, id: "r", confirmation_message: null });
    const { user } = setup({ confirmationMessage: "See you soon" }, { submit });
    await user.type(screen.getByLabelText(/^Name/), "James");
    await user.selectOptions(screen.getByLabelText(/^Role/), "dev");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByText("See you soon")).toBeInTheDocument();
  });
});

describe("file upload field", () => {
  const fileSchema: FormSchema = {
    title: "Upload",
    sections: [
      {
        id: "s",
        fields: [
          {
            id: "cv",
            type: "file_upload",
            label: "CV",
            required: true,
            validation: { maxFiles: 1, maxSizeMb: 1, accept: ["application/pdf"] },
          },
        ],
      },
    ],
  };

  it("uploads, lists the file, and submits the file answer", async () => {
    const answer = {
      path: "form-1/cv/abc-cv.pdf",
      name: "cv.pdf",
      size: 4,
      mime: "application/pdf",
    };
    const upload = vi.fn().mockResolvedValue(answer);
    const { api, user } = setup({ schema: fileSchema }, { upload });

    const file = new File(["%PDF"], "cv.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(/^CV/), file);

    expect(await screen.findByText(/cv\.pdf/)).toBeInTheDocument();
    expect(upload).toHaveBeenCalledWith("my-form", "cv", file);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(api.submit).toHaveBeenCalledWith("my-form", { cv: [answer] }));
  });

  it("rejects wrong file types before uploading", async () => {
    const upload = vi.fn();
    setup({ schema: fileSchema }, { upload });
    // user-event filters by the input's `accept` by default; disable that so the
    // component's own validation is what's under test.
    const user = userEvent.setup({ applyAccept: false });

    const bad = new File(["x"], "pic.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/^CV/), bad);

    expect(await screen.findByRole("alert")).toHaveTextContent("not an accepted file type");
    expect(upload).not.toHaveBeenCalled();
  });
});
