import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ComponentSettingsPanel } from "@/features/cms/components/page-builder/ComponentSettingsPanel";
import { usePageBuilder } from "@/features/cms/hooks/usePageBuilderContext";
import { useCmsThemes, useCmsDomains, useCmsSlugs, useCmsAllSlugs } from "@/features/cms/hooks/useCmsQueries";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a new QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock hooks
vi.mock("@/features/cms/hooks/usePageBuilderContext", () => ({
  usePageBuilder: vi.fn(),
}));

vi.mock("@/features/cms/hooks/useCmsQueries", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useCmsThemes: vi.fn(),
    useCmsDomains: vi.fn(),
    useCmsSlugs: vi.fn(),
    useCmsAllSlugs: vi.fn(),
  };
});

vi.mock("@/features/cms/components/page-builder/section-registry", () => ({
  getSectionDefinition: (type: string) => {
    if (type === "Hero") {
      return {
        label: "Hero banner",
        settingsSchema: [
          { key: "image", label: "Image", type: "image" },
          { key: "imageHeight", label: "Image height", type: "select" },
          { key: "colorScheme", label: "Color scheme", type: "color-scheme" },
          { key: "paddingTop", label: "Top padding", type: "number" },
          { key: "paddingBottom", label: "Bottom padding", type: "number" },
          { key: "backgroundColor", label: "Background color", type: "color" },
          { key: "sectionBorder", label: "Border", type: "border" },
          { key: "sectionShadow", label: "Shadow", type: "shadow" },
        ],
      };
    }
    return null;
  },
  getBlockDefinition: (type: string) => {
    if (type === "Heading") {
      return {
        label: "Heading Block",
        settingsSchema: [{ key: "text", label: "Text", type: "text" }],
      };
    }
    return null;
  },
}));

vi.mock("@/shared/ui", async () => {
  const actual = await vi.importActual("@/shared/ui");
  return {
    ...actual,
    Tabs: ({ children, defaultValue }: any) => <div data-testid="tabs" data-default={defaultValue}>{children}</div>,
    TabsList: ({ children }: any) => <div data-testid="tabs-list" role="tablist">{children}</div>,
    TabsTrigger: ({ children, value }: any) => <button role="tab" data-testid={`tab-trigger-${value}`}>{children}</button>,
    TabsContent: ({ children, value }: any) => <div role="tabpanel" data-testid={`tab-content-${value}`}>{children}</div>,
    Button: ({ children, onClick, variant }: any) => (
      <button onClick={onClick} data-variant={variant}>{children}</button>
    ),
  };
});

vi.mock("@/shared/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/cms/components/page-builder/MediaLibraryPanel", () => ({
  MediaLibraryPanel: () => <div data-testid="media-library">Media</div>,
}));

vi.mock("@/features/cms/components/page-builder/SettingsFieldRenderer", () => ({
  SettingsFieldRenderer: ({ field, value, onChange }: any) => (
    <div data-testid={`field-${field.key}`}>
      <label htmlFor={`input-${field.key}`}>{field.label}</label>
      <input 
        id={`input-${field.key}`}
        data-testid={`input-${field.key}`}
        value={typeof value === "string" || typeof value === "number" ? value : ""} 
        onChange={(e) => onChange(field.key, e.target.value)} 
      />
    </div>
  ),
}));

vi.mock("@/features/cms/components/page-builder/AnimationConfigPanel", () => ({
  AnimationConfigPanel: () => <div data-testid="animation-panel">Animation</div>,
}));

describe("ComponentSettingsPanel Component", () => {
  const mockDispatch = vi.fn();
  const mockPage = { id: "1", name: "Test Page", status: "draft" as const, seoTitle: "" };

  beforeEach(() => {
    vi.clearAllMocks();
    (useCmsThemes as any).mockReturnValue({ data: [], isLoading: false });
    (useCmsDomains as any).mockReturnValue({ data: [], isLoading: false });
    (useCmsSlugs as any).mockReturnValue({ data: [], isLoading: false });
    (useCmsAllSlugs as any).mockReturnValue({ data: [], isLoading: false });
  });

  it("should show 'Select a page' message when no page is set", () => {
    (usePageBuilder as any).mockReturnValue({
      state: { currentPage: null },
      dispatch: mockDispatch,
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ComponentSettingsPanel />
      </QueryClientProvider>
    );
    expect(screen.getByText(/Select a page first/i)).toBeInTheDocument();
  });

  it("should show page settings when nothing is selected", () => {
    (usePageBuilder as any).mockReturnValue({
      state: { currentPage: mockPage },
      selectedSection: null,
      selectedBlock: null,
      selectedColumn: null,
      dispatch: mockDispatch,
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ComponentSettingsPanel />
      </QueryClientProvider>
    );
    expect(screen.getAllByText("Test Page").length).toBeGreaterThan(0);
    expect(screen.getByText("Status")).toBeInTheDocument();
    
    expect(screen.getByRole("tab", { name: /Page/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /SEO/i })).toBeInTheDocument();
  });

  it("should render section settings when a section is selected", () => {
    const mockSection = {
      id: "sec-1",
      type: "Hero",
      settings: { imageHeight: "large" },
    };

    (usePageBuilder as any).mockReturnValue({
      state: { currentPage: mockPage },
      selectedSection: mockSection,
      selectedBlock: null,
      selectedColumn: null,
      dispatch: mockDispatch,
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ComponentSettingsPanel />
      </QueryClientProvider>
    );
    
    expect(screen.getByText(/Section: Hero banner/i)).toBeInTheDocument();
    expect(screen.getByText("Image height")).toBeInTheDocument();
  });

  it("should handle removing a section", () => {
    const mockSection = { id: "sec-1", type: "Hero", settings: {} };

    (usePageBuilder as any).mockReturnValue({
      state: { currentPage: mockPage },
      selectedSection: mockSection,
      selectedBlock: null,
      selectedColumn: null,
      dispatch: mockDispatch,
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ComponentSettingsPanel />
      </QueryClientProvider>
    );
    
    const removeBtn = screen.getByRole("button", { name: /Remove section/i });
    fireEvent.click(removeBtn);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "REMOVE_SECTION",
      sectionId: "sec-1",
    });
  });

  it("should update SEO settings", async () => {
    (usePageBuilder as any).mockReturnValue({
      state: { currentPage: mockPage },
      selectedSection: null,
      selectedBlock: null,
      selectedColumn: null,
      dispatch: mockDispatch,
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ComponentSettingsPanel />
      </QueryClientProvider>
    );
    
    const seoTab = screen.getByRole("tab", { name: /SEO/i });
    fireEvent.click(seoTab);

    const titleInput = await screen.findByLabelText(/Page title/i);
    fireEvent.change(titleInput, { target: { value: "New Title" } });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "UPDATE_SEO",
      seo: { seoTitle: "New Title" },
    });
  });
});
