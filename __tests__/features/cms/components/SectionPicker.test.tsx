import { render, screen, fireEvent } from "@testing-library/react";
import { SectionPicker } from "@/features/cms/components/page-builder/SectionPicker";
import { usePageBuilder } from "@/features/cms/hooks/usePageBuilderContext";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
    Dialog: ({ children, open }: any) => (
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

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("SectionPicker Component", () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (usePageBuilder as any).mockImplementation(() => ({ dispatch: mockDispatch }));
  });

  it("should render the add section button", () => {
    render(<SectionPicker zone="template" onSelect={vi.fn()} />, { wrapper });
    expect(screen.getByRole("button", { name: /Add section/i })).toBeInTheDocument();
  });

  it("should call onSelect when a section type is clicked", () => {
    const onSelect = vi.fn();
    render(<SectionPicker zone="template" onSelect={onSelect} />, { wrapper });

    // Open the dialog by clicking the trigger
    fireEvent.click(screen.getByRole("button", { name: /Add section/i }));
    
    const richTextOption = screen.getByText("Rich text");
    fireEvent.click(richTextOption);

    expect(onSelect).toHaveBeenCalledWith("RichText");
  });

  it("should be disabled when the disabled prop is true", () => {
    render(<SectionPicker zone="template" onSelect={vi.fn()} disabled={true} />, { wrapper });
    const addButton = screen.getByRole("button", { name: /Add section/i });
    expect(addButton).toBeDisabled();
  });
});