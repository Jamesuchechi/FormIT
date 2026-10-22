import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TemplatePickerModal } from "./TemplatePickerModal";
import { FORM_TEMPLATES } from "./templates";

describe("TemplatePickerModal", () => {
  it("renders when open and lists blank option + templates", () => {
    render(
      <TemplatePickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectBlank={vi.fn()}
        onSelectTemplate={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Create a new form")).toBeInTheDocument();
    expect(screen.getByText("Blank Form")).toBeInTheDocument();
    expect(screen.getByText("Contact Us")).toBeInTheDocument();
    expect(screen.getByText("Customer Feedback")).toBeInTheDocument();
    expect(screen.getByText("Event RSVP")).toBeInTheDocument();
    expect(screen.getByText("Job Application")).toBeInTheDocument();
    expect(screen.getByText("Event Registration")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <TemplatePickerModal
        isOpen={false}
        onClose={vi.fn()}
        onSelectBlank={vi.fn()}
        onSelectTemplate={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onSelectBlank when Blank Form card is clicked", () => {
    const onSelectBlank = vi.fn();
    render(
      <TemplatePickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectBlank={onSelectBlank}
        onSelectTemplate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Blank Form"));
    expect(onSelectBlank).toHaveBeenCalledTimes(1);
  });

  it("calls onSelectTemplate with the chosen template object", () => {
    const onSelectTemplate = vi.fn();
    render(
      <TemplatePickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectBlank={vi.fn()}
        onSelectTemplate={onSelectTemplate}
      />,
    );

    fireEvent.click(screen.getByText("Job Application"));
    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
    expect(onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job_application", title: "Job Application" }),
    );
  });

  it("filters templates by search query", () => {
    render(
      <TemplatePickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectBlank={vi.fn()}
        onSelectTemplate={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Filter templates...");
    fireEvent.change(searchInput, { target: { value: "hiring" } }); // not matched

    expect(screen.getByText(/No templates found matching/)).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "RSVP" } });
    expect(screen.getByText("Event RSVP")).toBeInTheDocument();
    expect(screen.queryByText("Job Application")).not.toBeInTheDocument();
  });

  it("closes when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <TemplatePickerModal
        isOpen={true}
        onClose={onClose}
        onSelectBlank={vi.fn()}
        onSelectTemplate={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
