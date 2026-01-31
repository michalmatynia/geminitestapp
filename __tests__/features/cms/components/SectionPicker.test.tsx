import { render, screen, fireEvent } from "@testing-library/react";
import { SectionPicker } from "@/features/cms/components/page-builder/SectionPicker";
import { usePageBuilder } from "@/features/cms/hooks/usePageBuilderContext";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock hooks
vi.mock("@/features/cms/hooks/usePageBuilderContext", () => ({
  usePageBuilder: vi.fn(),
}));

// Mock the registry
vi.mock("@/features/cms/components/page-builder/section-registry", () => ({
  getAllSectionTypes: () => [
    { type: "RichText", label: "Rich text", icon: "AlignLeft", allowedBlockTypes: [] },
    { type: "Hero", label: "Hero banner", icon: "Layers", allowedBlockTypes: [] },
  ],
  getSectionTypesForZone: () => [
    { type: "RichText", label: "Rich text", icon: "AlignLeft", allowedBlockTypes: [] },
    { type: "Hero", label: "Hero banner", icon: "Layers", allowedBlockTypes: [] },
  ],
}));

// Mock templates
vi.mock("@/features/cms/components/page-builder/section-templates", () => ({
  getTemplatesByCategory: () => ({}),
}));

// Mock Dialog components
vi.mock("@/shared/ui", async () => {
  const actual = await vi.importActual("@/shared/ui");
  return {
    ...actual,
    Dialog: ({ children, open, _onOpenChange }: any) => (
      <div data-testid="dialog">
        {children}
        {open && <div data-testid="dialog-content" />}
      </div>
    ),
    DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogTrigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>,
  };
});

describe("SectionPicker Component", () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (usePageBuilder as any).mockReturnValue({ dispatch: mockDispatch });
  });

  it("should render the add section button", () => {
    render(<SectionPicker zone="template" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Add section/i })).toBeInTheDocument();
  });

  it("should call onSelect when a section type is clicked", () => {
    const onSelect = vi.fn();
    render(<SectionPicker zone="template" onSelect={onSelect} />);

    // Since we mocked Dialog, we might need to simulate opening or just check if it renders content when open
    // For simplicity in unit test, we can check if content is rendered.
    // In our mock, DialogContent is always rendered if we don't control 'open' state strictly.
    
    const richTextOption = screen.getByText("Rich text");
    fireEvent.click(richTextOption);

    expect(onSelect).toHaveBeenCalledWith("RichText");
  });

  it("should be disabled when the disabled prop is true", () => {
    render(<SectionPicker zone="template" onSelect={vi.fn()} disabled={true} />);
    const addButton = screen.getByRole("button", { name: /Add section/i });
    expect(addButton).toBeDisabled();
  });
});