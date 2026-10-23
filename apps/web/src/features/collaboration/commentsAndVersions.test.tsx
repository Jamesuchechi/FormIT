import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FormSchema } from "@formit/schema";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { FormRecord } from "../../lib/api.ts";
import { FieldCommentsModal } from "./FieldCommentsModal.tsx";
import * as commentsApi from "./commentsApi.ts";
import { VersionHistoryModal } from "../builder/VersionHistoryModal.tsx";
import * as versionsApi from "../builder/versionsApi.ts";
import { BuilderHeader } from "../builder/BuilderHeader.tsx";
import { BuilderFieldCard } from "../builder/BuilderFieldCard.tsx";
import type { BuilderActions, BuilderState } from "../builder/types.ts";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockSchemaV1: FormSchema = {
  title: "User Research Questionnaire",
  description: "Initial feedback survey",
  sections: [
    {
      id: "s1",
      title: "General Information",
      fields: [
        {
          id: "f1",
          type: "short_text",
          label: "Full Name",
          required: true,
          validation: {},
        },
        {
          id: "f2",
          type: "multiple_choice",
          label: "Primary Role",
          options: [
            { id: "o1", label: "Engineer" },
            { id: "o2", label: "Designer" },
          ],
          required: false,
        },
      ],
    },
  ],
};

const mockSchemaV2: FormSchema = {
  title: "User Research Questionnaire (Updated)",
  description: "Revised feedback survey with phone number",
  sections: [
    {
      id: "s1",
      title: "General Information",
      fields: [
        {
          id: "f1",
          type: "short_text",
          label: "Full Name",
          required: true,
          validation: {},
        },
        {
          id: "f3",
          type: "short_text",
          label: "Phone Number",
          required: false,
          validation: {},
        },
      ],
    },
  ],
};

const mockForm: FormRecord = {
  id: "form-research-456",
  ownerId: "user-owner-1",
  workspaceId: null,
  slug: "user-research",
  title: "User Research Questionnaire",
  schema: mockSchemaV1,
  schemaVersion: 2,
  settings: {},
  status: "draft",
  opensAt: null,
  closesAt: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-02T10:00:00.000Z",
  currentUserRole: "owner",
};

const mockState: BuilderState = {
  form: mockForm,
  schema: mockSchemaV1,
  selectedFieldId: "f1",
  selectedSectionId: "s1",
  activeTab: "builder",
  isSaving: false,
  hasUnsavedChanges: false,
  lastSaved: new Date(),
  saveError: null,
  canUndo: false,
  canRedo: false,
  isReadOnly: false,
};

const mockActions: BuilderActions = {
  selectField: vi.fn(),
  selectSection: vi.fn(),
  setActiveTab: vi.fn(),
  updateTitle: vi.fn(),
  updateDescription: vi.fn(),
  addSection: vi.fn(),
  updateSection: vi.fn(),
  deleteSection: vi.fn(),
  reorderSections: vi.fn(),
  addField: vi.fn(),
  insertQuestion: vi.fn(),
  updateField: vi.fn(),
  deleteField: vi.fn(),
  duplicateField: vi.fn(),
  reorderFields: vi.fn(),
  changeFieldType: vi.fn(),
  updateFieldRule: vi.fn(),
  updateTheme: vi.fn(),
  updateSettings: vi.fn(),
  updateStatus: vi.fn(),
  updateSlug: vi.fn().mockResolvedValue(true),
  undo: vi.fn(),
  redo: vi.fn(),
  saveNow: vi.fn().mockResolvedValue(undefined),
  restoreSchema: vi.fn(),
};

describe("Field Comments & Version History Feature", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("FieldCommentsModal", () => {
    const mockComments: commentsApi.FieldComment[] = [
      {
        id: "comm-1",
        formId: mockForm.id,
        fieldId: "f1",
        authorId: "user-1",
        authorEmail: "alice@example.com",
        content: "Should this question be required for visitors?",
        status: "open",
        createdAt: "2026-01-02T12:00:00.000Z",
        updatedAt: "2026-01-02T12:00:00.000Z",
      },
      {
        id: "comm-2",
        formId: mockForm.id,
        fieldId: "f1",
        authorId: "user-2",
        authorEmail: "bob@example.com",
        content: "I made it optional in the draft.",
        status: "resolved",
        createdAt: "2026-01-02T13:00:00.000Z",
        updatedAt: "2026-01-02T13:30:00.000Z",
      },
    ];

    it("renders field comments and allows switching between open and all filters", async () => {
      vi.spyOn(commentsApi, "getFormComments").mockResolvedValue(mockComments);

      renderWithProviders(
        <FieldCommentsModal
          formId={mockForm.id}
          fieldId="f1"
          fieldLabel="Full Name"
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      // Question title in subtitle
      expect(await screen.findByText(/Full Name/)).toBeInTheDocument();

      // Default filter is 'Open (1)'
      expect(await screen.findByText("Should this question be required for visitors?")).toBeInTheDocument();
      expect(screen.queryByText("I made it optional in the draft.")).not.toBeInTheDocument();

      // Switch to 'All (2)' filter
      const allTab = screen.getByRole("button", { name: /All \(2\)/i });
      await userEvent.click(allTab);

      expect(await screen.findByText("I made it optional in the draft.")).toBeInTheDocument();
      expect(screen.getByText("Resolved")).toBeInTheDocument();
    });

    it("submits a new comment and calls addFieldComment API", async () => {
      vi.spyOn(commentsApi, "getFormComments").mockResolvedValue([]);
      const addSpy = vi.spyOn(commentsApi, "addFieldComment").mockResolvedValue({
        id: "comm-new",
        formId: mockForm.id,
        fieldId: "f1",
        authorId: "user-current",
        authorEmail: "me@example.com",
        content: "Could we clarify the placeholder text?",
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(
        <FieldCommentsModal
          formId={mockForm.id}
          fieldId="f1"
          fieldLabel="Full Name"
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      const textarea = await screen.findByPlaceholderText(/Leave a comment on this question/i);
      await userEvent.type(textarea, "Could we clarify the placeholder text?");

      const submitBtn = screen.getByRole("button", { name: /Comment/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(addSpy).toHaveBeenCalledWith({
          formId: mockForm.id,
          fieldId: "f1",
          content: "Could we clarify the placeholder text?",
        });
      });
    });

    it("toggles comment status between open and resolved", async () => {
      vi.spyOn(commentsApi, "getFormComments").mockResolvedValue([mockComments[0]!]);
      const updateSpy = vi.spyOn(commentsApi, "updateFieldCommentStatus").mockResolvedValue();

      renderWithProviders(
        <FieldCommentsModal
          formId={mockForm.id}
          fieldId="f1"
          fieldLabel="Full Name"
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      expect(await screen.findByText("alice@example.com")).toBeInTheDocument();

      const resolveBtn = screen.getByTitle("Mark as resolved");
      await userEvent.click(resolveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith("comm-1", "resolved");
      });
    });

    it("deletes a comment when delete button is clicked", async () => {
      vi.spyOn(commentsApi, "getFormComments").mockResolvedValue([mockComments[0]!]);
      const deleteSpy = vi.spyOn(commentsApi, "deleteFieldComment").mockResolvedValue();

      renderWithProviders(
        <FieldCommentsModal
          formId={mockForm.id}
          fieldId="f1"
          fieldLabel="Full Name"
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      expect(await screen.findByText("alice@example.com")).toBeInTheDocument();

      const deleteBtn = screen.getByTitle("Delete comment");
      await userEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith("comm-1");
      });
    });

    it("hides input in read-only mode for viewers", async () => {
      vi.spyOn(commentsApi, "getFormComments").mockResolvedValue(mockComments);

      renderWithProviders(
        <FieldCommentsModal
          formId={mockForm.id}
          fieldId="f1"
          fieldLabel="Full Name"
          isOpen={true}
          onClose={vi.fn()}
          isReadOnly={true}
        />,
      );

      expect(await screen.findByText(/Viewing comments in read-only mode/i)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/Leave a comment/i)).not.toBeInTheDocument();
    });
  });

  describe("VersionHistoryModal", () => {
    const mockVersions: versionsApi.FormVersionHistoryItem[] = [
      {
        version: 2,
        schema: mockSchemaV2,
        label: "Added phone number field",
        createdBy: "user-owner-1",
        createdAt: "2026-01-02T14:00:00.000Z",
      },
      {
        version: 1,
        schema: mockSchemaV1,
        label: "Initial questionnaire baseline",
        createdBy: "user-owner-1",
        createdAt: "2026-01-01T10:00:00.000Z",
      },
    ];

    it("renders list of versions and displays preview of selected version", async () => {
      vi.spyOn(versionsApi, "getFormVersionHistory").mockResolvedValue(mockVersions);

      renderWithProviders(
        <VersionHistoryModal
          state={mockState}
          actions={mockActions}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      // Version badges
      expect(await screen.findByText("v2")).toBeInTheDocument();
      expect(screen.getByText("v1")).toBeInTheDocument();

      // Current active version indicator
      expect(screen.getByText("Active")).toBeInTheDocument();

      // Click on v1 to view its preview
      const v1Card = screen.getByText("Initial questionnaire baseline");
      await userEvent.click(v1Card);

      // Right preview pane displays v1 details
      expect(await screen.findByText("Primary Role")).toBeInTheDocument();
      expect(screen.getByText("Version 1")).toBeInTheDocument();
    });

    it("creates a new named checkpoint snapshot", async () => {
      vi.spyOn(versionsApi, "getFormVersionHistory").mockResolvedValue(mockVersions);
      const snapshotSpy = vi.spyOn(versionsApi, "createVersionSnapshot").mockResolvedValue(3);

      renderWithProviders(
        <VersionHistoryModal
          state={mockState}
          actions={mockActions}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      const input = await screen.findByPlaceholderText(/Checkpoint label/i);
      await userEvent.type(input, "Before client demo");

      const createBtn = screen.getByRole("button", { name: /Create Checkpoint/i });
      await userEvent.click(createBtn);

      await waitFor(() => {
        expect(snapshotSpy).toHaveBeenCalledWith(mockForm.id, "Before client demo");
      });
      expect(await screen.findByText(/New version snapshot created successfully/i)).toBeInTheDocument();
    });

    it("restores historical version and calls actions.restoreSchema", async () => {
      vi.spyOn(versionsApi, "getFormVersionHistory").mockResolvedValue(mockVersions);
      const restoreSpy = vi.spyOn(versionsApi, "restoreFormVersion").mockResolvedValue(mockSchemaV1);

      renderWithProviders(
        <VersionHistoryModal
          state={mockState}
          actions={mockActions}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      // Select v1 (which is not current)
      const v1Card = await screen.findByText("Initial questionnaire baseline");
      await userEvent.click(v1Card);

      const restoreBtn = await screen.findByRole("button", { name: /Restore this version/i });
      await userEvent.click(restoreBtn);

      // Confirm step
      const confirmBtn = await screen.findByRole("button", { name: /Confirm Restore/i });
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(restoreSpy).toHaveBeenCalledWith(mockForm.id, 1);
        expect(mockActions.restoreSchema).toHaveBeenCalledWith(mockSchemaV1);
      });
      expect(await screen.findByText(/Successfully restored version 1/i)).toBeInTheDocument();
    });
  });

  describe("BuilderFieldCard comment integration", () => {
    it("renders comment button with unresolved comment count badge", async () => {
      vi.spyOn(commentsApi, "getFormComments").mockResolvedValue([
        {
          id: "c1",
          formId: mockForm.id,
          fieldId: "f1",
          authorId: "u1",
          authorEmail: "alex@example.com",
          content: "Needs rewording",
          status: "open",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      renderWithProviders(
        <BuilderFieldCard
          field={mockSchemaV1.sections[0]!.fields[0]!}
          sectionId="s1"
          isSelected={true}
          onSelect={vi.fn()}
          actions={mockActions}
          formId={mockForm.id}
        />,
      );

      const commentBtn = await screen.findByTitle("1 unresolved comment(s)");
      expect(commentBtn).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();

      // Clicking opens FieldCommentsModal
      await userEvent.click(commentBtn);
      expect(await screen.findByText("Needs rewording")).toBeInTheDocument();
    });
  });

  describe("BuilderHeader History button integration", () => {
    it("renders History button and opens VersionHistoryModal on click", async () => {
      vi.spyOn(versionsApi, "getFormVersionHistory").mockResolvedValue([]);

      renderWithProviders(
        <BuilderHeader state={mockState} actions={mockActions} />,
      );

      const historyBtn = screen.getByRole("button", { name: /History/i });
      expect(historyBtn).toBeInTheDocument();

      await userEvent.click(historyBtn);
      expect(await screen.findByText("Version History")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Checkpoint label/i)).toBeInTheDocument();
    });
  });
});
