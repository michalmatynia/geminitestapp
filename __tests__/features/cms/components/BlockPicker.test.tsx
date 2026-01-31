import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlockPicker } from "@/features/cms/components/page-builder/BlockPicker";
import { vi } from "vitest";

// Mock the registry
vi.mock("@/features/cms/components/page-builder/section-registry", () => ({
  getAllowedBlockTypes: (type: string) => {
    if (type === "RichText") {
      return [
        { type: "Heading", label: "Heading", icon: "Heading" },
        { type: "Text", label: "Text", icon: "AlignLeft" },
      ];
    }
    return [];
  },
}));

describe("BlockPicker Component", () => {
  it("should render nothing if no blocks are allowed for the section type", () => {
    const { container } = render(<BlockPicker sectionType="EmptySection" onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("should toggle the block menu when clicking the plus button", () => {
    const onSelect = vi.fn();
    render(<BlockPicker sectionType="RichText" onSelect={onSelect} />);

    const plusButton = screen.getByLabelText("Add block");
    
    // Initially closed
    expect(screen.queryByText("Heading")).not.toBeInTheDocument();

    // Open
    fireEvent.click(plusButton);
    expect(screen.getByText("Heading")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();

    // Close
    fireEvent.click(plusButton);
    expect(screen.queryByText("Heading")).not.toBeInTheDocument();
  });

  it("should call onSelect and close when a block is clicked", () => {
    const onSelect = vi.fn();
    render(<BlockPicker sectionType="RichText" onSelect={onSelect} />);

    fireEvent.click(screen.getByLabelText("Add block"));
    fireEvent.click(screen.getByText("Heading"));

    expect(onSelect).toHaveBeenCalledWith("Heading");
    expect(screen.queryByText("Heading")).not.toBeInTheDocument();
  });
});
