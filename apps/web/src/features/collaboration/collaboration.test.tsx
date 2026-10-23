import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FormSchema } from "@formit/schema";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { FormRecord } from "../../lib/api.ts";
import { CollaboratorsModal } from "./CollaboratorsModal.tsx";
import * as collaborationApi from "./collaborationApi.ts";
import { WorkspaceSwitcher } from "../workspaces/WorkspaceSwitcher.tsx";
import { CreateWorkspaceModal } from "../workspaces/CreateWorkspaceModal.tsx";
import { BuilderHeader } from "../builder/BuilderHeader.tsx";
import { useBuilderState } from "../builder/useBuilderState.ts";

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

const mockSchema: FormSchema = {
  title: "Team Pulse Survey",
  description: "Weekly feedback",
  sections: [
    {
      id: "s1",
      title: "Section 1",
      fields: [
        {
          id: "f1",
          type: "short_text",
          label: "Team Name",
          required: true,
          validation: {},
        },
      ],
    },
  ],
};

const mockForm: FormRecord = {
  id: "form-pulse-123",
  ownerId: "user-owner-1",
  workspaceId: null,
  slug: "team-pulse",
  title: "Team Pulse Survey",
  schema: mockSchema,
  schemaVersion: 1,
  settings: {},
  status: "draft",
  opensAt: null,
  closesAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currentUserRole: "owner",
};

describe("Collaboration & Workspaces Feature", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("CollaboratorsModal", () => {
    it("renders modal with form title, owner indicator, and invite controls for owner", async () => {
      vi.spyOn(collaborationApi, "getFormCollaborators").mockResolvedValue([
        {
          id: "collab-1",
          formId: "form-pulse-123",
          userId: "user-editor-1",
          email: "alex@example.com",
          role: "editor",
          createdAt: new Date().toISOString(),
        },
      ]);
      vi.spyOn(collaborationApi, "getFormInvites").mockResolvedValue([
        {
          id: "inv-1",
          email: "sam@example.com",
          targetType: "form",
          targetId: "form-pulse-123",
          role: "viewer",
          token: "token-abc-123",
          status: "pending",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ]);

      renderWithProviders(
        <CollaboratorsModal
          formId={mockForm.id}
          formTitle={mockForm.title}
          isOpen={true}
          onClose={vi.fn()}
          currentUserRole="owner"
        />,
      );

      expect(screen.getByText("Collaborate on Form")).toBeInTheDocument();
      expect(screen.getByText("Team Pulse Survey")).toBeInTheDocument();
      expect(screen.getByText("Form Owner")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("teammate@example.com")).toBeInTheDocument();

      // Verify active collaborator and pending invite are rendered
      await waitFor(() => {
        expect(screen.getByText("alex@example.com")).toBeInTheDocument();
        expect(screen.getByText("sam@example.com")).toBeInTheDocument();
      });
    });

    it("sends an invitation and shows the generated invite link", async () => {
      const user = userEvent.setup();
      vi.spyOn(collaborationApi, "getFormCollaborators").mockResolvedValue([]);
      vi.spyOn(collaborationApi, "getFormInvites").mockResolvedValue([]);
      const inviteSpy = vi.spyOn(collaborationApi, "inviteCollaborator").mockResolvedValue({
        id: "inv-new",
        email: "jordan@example.com",
        targetType: "form",
        targetId: "form-pulse-123",
        role: "viewer",
        token: "token-xyz-789",
        status: "pending",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });

      renderWithProviders(
        <CollaboratorsModal
          formId={mockForm.id}
          formTitle={mockForm.title}
          isOpen={true}
          onClose={vi.fn()}
          currentUserRole="owner"
        />,
      );

      const emailInput = screen.getByPlaceholderText("teammate@example.com");
      const roleSelect = screen.getByRole("combobox");
      const inviteBtn = screen.getByRole("button", { name: /invite/i });

      await user.type(emailInput, "jordan@example.com");
      await user.selectOptions(roleSelect, "viewer");
      await user.click(inviteBtn);

      expect(inviteSpy).toHaveBeenCalledWith({
        targetType: "form",
        targetId: "form-pulse-123",
        email: "jordan@example.com",
        role: "viewer",
      });

      // Confirm success banner with copy link button is displayed
      await waitFor(() => {
        expect(screen.getByText(/invite generated! share this link/i)).toBeInTheDocument();
      });
    });

    it("renders read-only notice for viewer and hides invite form", async () => {
      vi.spyOn(collaborationApi, "getFormCollaborators").mockResolvedValue([]);
      vi.spyOn(collaborationApi, "getFormInvites").mockResolvedValue([]);

      renderWithProviders(
        <CollaboratorsModal
          formId={mockForm.id}
          formTitle={mockForm.title}
          isOpen={true}
          onClose={vi.fn()}
          currentUserRole="viewer"
        />,
      );

      expect(
        screen.getByText(/You have viewer access to this form\. Only owners can invite or remove/i),
      ).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("teammate@example.com")).not.toBeInTheDocument();
    });
  });

  describe("WorkspaceSwitcher & CreateWorkspaceModal", () => {
    it("renders workspace switcher and opens workspace creation modal", async () => {
      const user = userEvent.setup();
      vi.spyOn(collaborationApi, "getWorkspaces").mockResolvedValue([
        {
          id: "ws-1",
          ownerId: "user-owner-1",
          name: "Acme Corp",
          slug: "acme-corp",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          currentUserRole: "owner",
        },
      ]);

      const onSelect = vi.fn();
      renderWithProviders(
        <WorkspaceSwitcher activeWorkspace={null} onSelectWorkspace={onSelect} />,
      );

      // Default personal forms button
      const triggerBtn = screen.getByRole("button", { name: /personal forms/i });
      expect(triggerBtn).toBeInTheDocument();

      await user.click(triggerBtn);

      // Verify dropdown shows workspace item and Create Workspace option
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      const createWsBtn = screen.getByRole("button", { name: /create workspace/i });
      expect(createWsBtn).toBeInTheDocument();

      // Open create workspace modal
      await user.click(createWsBtn);
      expect(screen.getByRole("heading", { name: /create workspace/i })).toBeInTheDocument();
    });

    it("creates a new workspace through CreateWorkspaceModal", async () => {
      const user = userEvent.setup();
      const createSpy = vi.spyOn(collaborationApi, "createWorkspace").mockResolvedValue({
        id: "ws-created",
        ownerId: "user-owner-1",
        name: "Design Studio",
        slug: "design-studio",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentUserRole: "owner",
      });

      const onCreated = vi.fn();
      const onClose = vi.fn();

      renderWithProviders(
        <CreateWorkspaceModal isOpen={true} onClose={onClose} onCreated={onCreated} />,
      );

      const nameInput = screen.getByPlaceholderText(/e\.g\. Acme Marketing/i);
      await user.type(nameInput, "Design Studio");

      const submitBtn = screen.getByRole("button", { name: /create workspace/i });
      await user.click(submitBtn);

      expect(createSpy).toHaveBeenCalledWith({
        name: "Design Studio",
        slug: "design-studio",
      });
      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith(
          expect.objectContaining({ name: "Design Studio", slug: "design-studio" }),
        );
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe("Viewer Read-Only Enforcement", () => {
    it("marks useBuilderState as read-only and displays Viewer badge in BuilderHeader", () => {
      const viewerForm: FormRecord = {
        ...mockForm,
        currentUserRole: "viewer",
      };

      const { result } = renderHook(() => useBuilderState(viewerForm));
      expect(result.current.state.isReadOnly).toBe(true);

      renderWithProviders(
        <BuilderHeader state={result.current.state} actions={result.current.actions} />,
      );

      // Viewer badge is rendered
      expect(screen.getByText("Viewer")).toBeInTheDocument();

      // Form title input is disabled
      const titleInput = screen.getByPlaceholderText("Untitled form");
      expect(titleInput).toBeDisabled();

      // Collaborate button is rendered
      expect(screen.getByTitle("Manage Collaborators")).toBeInTheDocument();
    });
  });
});
