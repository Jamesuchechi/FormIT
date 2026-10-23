import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FormSchema } from "@formit/schema";
import type { FormRecord } from "../../lib/api.ts";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal.tsx";
import { useBuilderShortcuts } from "./useBuilderShortcuts.ts";
import { useBuilderState } from "./useBuilderState.ts";

const mockSchema: FormSchema = {
  title: "Shortcuts Form",
  sections: [
    {
      id: "sec_1",
      title: "First Section",
      fields: [
        {
          id: "f_1",
          type: "short_text",
          label: "First Question",
          required: false,
          validation: {},
        },
        {
          id: "f_2",
          type: "multiple_choice",
          label: "Second Question",
          required: false,
          options: [
            { id: "o1", label: "Option 1" },
            { id: "o2", label: "Option 2" },
          ],
        },
      ],
    },
  ],
};

const mockForm: FormRecord = {
  id: "form-shortcuts",
  ownerId: "user-1",
  slug: "shortcuts-form",
  title: "Shortcuts Form",
  schema: mockSchema,
  schemaVersion: 1,
  settings: {
    requireSignIn: false,
    oneResponsePerUser: false,
  },
  status: "draft",
  opensAt: null,
  closesAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("KeyboardShortcutsModal", () => {
  it("renders when open with all shortcut sections and key badges", () => {
    const handleClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("General & History")).toBeInTheDocument();
    expect(screen.getByText("Question Management")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("View Modes & Tabs")).toBeInTheDocument();

    // Verify key badges
    expect(screen.getByText("Save form changes immediately")).toBeInTheDocument();
    expect(screen.getByText("Add new question after current")).toBeInTheDocument();
    expect(screen.getByText("Duplicate selected question")).toBeInTheDocument();
  });

  it("calls onClose when Close button or Got it button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole("button", { name: "Close shortcuts" });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const gotItBtn = screen.getByRole("button", { name: "Got it" });
    await user.click(gotItBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("closes on Escape key press", () => {
    const handleClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when closed", () => {
    render(<KeyboardShortcutsModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });
});

function useTestBuilder(form: FormRecord = mockForm) {
  const { state, actions } = useBuilderState(form);
  const shortcuts = useBuilderShortcuts({ state, actions });
  return { state, actions, shortcuts };
}

describe("useBuilderShortcuts", () => {
  it("opens and closes shortcuts modal via '?' and Esc", () => {
    const { result } = renderHook(() => useTestBuilder());

    expect(result.current.shortcuts.isShortcutsOpen).toBe(false);

    // Press '?'
    act(() => {
      fireEvent.keyDown(window, { key: "?" });
    });
    expect(result.current.shortcuts.isShortcutsOpen).toBe(true);

    // Press 'Escape'
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(result.current.shortcuts.isShortcutsOpen).toBe(false);
  });

  it("navigates down with 'ArrowDown' / 'J' and up with 'ArrowUp' / 'K'", () => {
    const { result } = renderHook(() => useTestBuilder());

    // Initial selectedFieldId is 'f_1'
    expect(result.current.state.selectedFieldId).toBe("f_1");

    // Press ArrowDown -> select 'f_2'
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowDown" });
    });
    expect(result.current.state.selectedFieldId).toBe("f_2");

    // Press ArrowUp -> select 'f_1'
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowUp" });
    });
    expect(result.current.state.selectedFieldId).toBe("f_1");

    // Press 'j' -> select 'f_2'
    act(() => {
      fireEvent.keyDown(window, { key: "j" });
    });
    expect(result.current.state.selectedFieldId).toBe("f_2");

    // Press 'k' -> select 'f_1'
    act(() => {
      fireEvent.keyDown(window, { key: "k" });
    });
    expect(result.current.state.selectedFieldId).toBe("f_1");
  });

  it("toggles 'required' with 'R' key when not typing in an input", () => {
    const { result } = renderHook(() => useTestBuilder());

    expect(result.current.state.schema.sections[0]?.fields[0]?.required).toBe(false);

    // Press 'r'
    act(() => {
      fireEvent.keyDown(window, { key: "r" });
    });
    expect(result.current.state.schema.sections[0]?.fields[0]?.required).toBe(true);

    // Press 'r' again
    act(() => {
      fireEvent.keyDown(window, { key: "r" });
    });
    expect(result.current.state.schema.sections[0]?.fields[0]?.required).toBe(false);
  });

  it("duplicates selected question on Cmd+D / Ctrl+D", () => {
    const { result } = renderHook(() => useTestBuilder());

    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(2);

    // Press Ctrl+D
    act(() => {
      fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    });

    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(3);
    const newField = result.current.state.schema.sections[0]?.fields[1];
    expect(newField?.label).toBe("First Question (Copy)");
  });

  it("adds new question on Cmd+Enter / Ctrl+Enter", () => {
    const { result } = renderHook(() => useTestBuilder());

    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(2);

    // Press Cmd+Enter
    act(() => {
      fireEvent.keyDown(window, { key: "Enter", metaKey: true });
    });

    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(3);
  });

  it("deletes selected question on Delete key", () => {
    const { result } = renderHook(() => useTestBuilder());

    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(2);

    // Press Delete
    act(() => {
      fireEvent.keyDown(window, { key: "Delete" });
    });

    expect(result.current.state.schema.sections[0]?.fields).toHaveLength(1);
    expect(result.current.state.schema.sections[0]?.fields[0]?.id).toBe("f_2");
  });

  it("switches tabs with Alt+1..4 or single keys B, T, P", () => {
    const { result } = renderHook(() => useTestBuilder());

    expect(result.current.state.activeTab).toBe("builder");

    // Alt+2 -> theme
    act(() => {
      fireEvent.keyDown(window, { key: "2", altKey: true });
    });
    expect(result.current.state.activeTab).toBe("theme");

    // Alt+3 -> settings
    act(() => {
      fireEvent.keyDown(window, { key: "3", altKey: true });
    });
    expect(result.current.state.activeTab).toBe("settings");

    // Alt+4 -> preview
    act(() => {
      fireEvent.keyDown(window, { key: "4", altKey: true });
    });
    expect(result.current.state.activeTab).toBe("preview");

    // 'b' -> builder
    act(() => {
      fireEvent.keyDown(window, { key: "b" });
    });
    expect(result.current.state.activeTab).toBe("builder");

    // 't' -> theme
    act(() => {
      fireEvent.keyDown(window, { key: "t" });
    });
    expect(result.current.state.activeTab).toBe("theme");

    // 'p' -> preview
    act(() => {
      fireEvent.keyDown(window, { key: "p" });
    });
    expect(result.current.state.activeTab).toBe("preview");
  });

  it("does not trigger single-key shortcuts when typing in an input element", () => {
    const { result } = renderHook(() => useTestBuilder());

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    // Pressing 'r' inside input should NOT toggle required
    act(() => {
      fireEvent.keyDown(input, { key: "r" });
    });
    expect(result.current.state.schema.sections[0]?.fields[0]?.required).toBe(false);

    // Pressing 'p' inside input should NOT switch to preview
    act(() => {
      fireEvent.keyDown(input, { key: "p" });
    });
    expect(result.current.state.activeTab).toBe("builder");

    // Pressing '?' inside input should NOT open shortcuts modal
    act(() => {
      fireEvent.keyDown(input, { key: "?" });
    });
    expect(result.current.shortcuts.isShortcutsOpen).toBe(false);

    document.body.removeChild(input);
  });
});
