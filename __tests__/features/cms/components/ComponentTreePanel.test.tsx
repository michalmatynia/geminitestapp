import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ComponentTreePanel } from "@/features/cms/components/page-builder/ComponentTreePanel";
import { usePageBuilder } from "@/features/cms/hooks/usePageBuilderContext";
import { useCmsPages, useCmsPage } from "@/features/cms/hooks/useCmsQueries";
import { vi } from "vitest";

// Mock the hooks
vi.mock("@/features/cms/hooks/usePageBuilderContext", () => ({
  usePageBuilder: vi.fn(),
}));

vi.mock("@/features/cms/hooks/useCmsQueries", () => ({
  useCmsPages: vi.fn(),
  useCmsPage: vi.fn(),
}));

// Mock the child components to simplify testing
vi.mock("@/features/cms/components/page-builder/ComponentTreeNodeItem", () => ({
  SectionNodeItem: ({ section }: any) => <div data-testid="section-item">{section.type}</div>,
}));
vi.mock("@/features/cms/components/page-builder/SectionPicker", () => ({
  SectionPicker: () => <button>Add Section</button>,
}));
vi.mock("@/features/cms/components/page-builder/SectionTemplatePicker", () => ({
  SectionTemplatePicker: () => <button>Templates</button>,
}));

describe("ComponentTreePanel Component", () => {
  const mockDispatch = vi.fn();
  const mockPages = [
    { id: "1", name: "Home", status: "published" },
    { id: "2", name: "About", status: "draft" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useCmsPages as any).mockReturnValue({ data: mockPages, isLoading: false });
    (useCmsPage as any).mockReturnValue({ data: null, isLoading: false });
  });

  it("should render empty when no page is selected", () => {
    (usePageBuilder as any).mockReturnValue({
      state: { pages: mockPages, currentPage: null, sections: [] },
      dispatch: mockDispatch,
    });

    const { container } = render(<ComponentTreePanel />);
    // According to ComponentTreePanel.tsx: {!state.currentPage ? (<div className="p-4" />) : (...)}
    expect(container.querySelector('.p-4')).toBeInTheDocument();
  });

  it("should render zones and sections when a page is selected", () => {
    const mockCurrentPage = { id: "1", name: "Home" };
    const mockSections = [
      { id: "s1", type: "Hero", zone: "template", blocks: [] },
      { id: "s2", type: "RichText", zone: "footer", blocks: [] },
    ];

    (usePageBuilder as any).mockReturnValue({
      state: { 
        pages: mockPages, 
        currentPage: mockCurrentPage, 
        sections: mockSections,
        selectedNodeId: null,
        collapsedZones: new Set()
      },
      dispatch: mockDispatch,
    });

    render(<ComponentTreePanel />);

    // Check zones
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Template")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();

    // Check sections
    const sectionItems = screen.getAllByTestId("section-item");
    expect(sectionItems.length).toBe(2);
    expect(screen.getByText("Hero")).toBeInTheDocument();
    expect(screen.getByText("RichText")).toBeInTheDocument();
  });

  it("should toggle zone visibility", () => {
    const mockCurrentPage = { id: "1", name: "Home" };
    const mockSections = [{ id: "s1", type: "Hero", zone: "header", blocks: [] }];

    (usePageBuilder as any).mockReturnValue({
      state: { 
        pages: mockPages, 
        currentPage: mockCurrentPage, 
        sections: mockSections,
        selectedNodeId: null
      },
      dispatch: mockDispatch,
    });

    render(<ComponentTreePanel />);

    // Initially visible
    expect(screen.getByText("Hero")).toBeInTheDocument();

    // Toggle header zone
    const headerToggle = screen.getByText("Header");
    fireEvent.click(headerToggle);

    // After toggle, it should be hidden (since we mocked the state to be updated by internal useState in real component, 
    // but here we are testing if the click event is handled and triggers re-render or state change if we were using external state.
    // Wait, ComponentTreePanel uses internal setCollapsedZones. So it should work without extra mocking of state for collapse.)
    
    expect(screen.queryByText("Hero")).not.toBeInTheDocument();
  });


});
