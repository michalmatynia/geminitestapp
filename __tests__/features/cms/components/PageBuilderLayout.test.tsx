
import { render, screen, fireEvent } from "@testing-library/react";
import { PageBuilderLayout } from "@/features/cms/components/page-builder/PageBuilderLayout";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock dependencies
vi.mock("@/features/admin", () => ({
  useAdminLayout: () => ({
    setIsProgrammaticallyCollapsed: vi.fn(),
  }),
}));

vi.mock("../../hooks/useBuilderKeyboardShortcuts", () => ({
  useBuilderKeyboardShortcuts: vi.fn(),
}));

// We need to mock components using absolute paths
vi.mock("@/features/cms/components/page-builder/ComponentTreePanel", () => ({
  ComponentTreePanel: () => <div data-testid="component-tree-panel">Tree</div>,
}));

vi.mock("@/features/cms/components/page-builder/PagePreviewPanel", () => ({
  PagePreviewPanel: () => <div data-testid="page-preview-panel">Preview</div>,
}));

vi.mock("@/features/cms/components/page-builder/ComponentSettingsPanel", () => ({
  ComponentSettingsPanel: () => <div data-testid="component-settings-panel">Settings</div>,
}));

vi.mock("@/features/cms/components/page-builder/ThemeSettingsPanel", () => ({
  ThemeSettingsPanel: () => <div data-testid="theme-settings-panel">Theme</div>,
}));

vi.mock("@/features/cms/components/page-builder/MenuSettingsPanel", () => ({
  MenuSettingsPanel: () => <div data-testid="menu-settings-panel">Menu</div>,
}));

vi.mock("@/features/cms/components/page-builder/AppEmbedsPanel", () => ({
  AppEmbedsPanel: () => <div data-testid="app-embeds-panel">App Embeds</div>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("PageBuilderLayout Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all panels by default", () => {
    render(<PageBuilderLayout />, { wrapper });
    
    expect(screen.getByTestId("component-tree-panel")).toBeInTheDocument();
    expect(screen.getByTestId("page-preview-panel")).toBeInTheDocument();
    expect(screen.getByTestId("component-settings-panel")).toBeInTheDocument();
  });

  it("should toggle left panel", () => {
    render(<PageBuilderLayout />, { wrapper });
    
    // The animated container is the grandparent of the tree panel's content wrapper
    const leftPanel = screen.getByTestId("component-tree-panel").parentElement!.parentElement!;
    expect(leftPanel).toHaveClass("w-72");
    
    const hideBtn = screen.getByLabelText("Hide left panel");
    fireEvent.click(hideBtn);
    expect(leftPanel).toHaveClass("w-0");
    
    // Click again to show
    const showBtn = screen.getByLabelText("Show left panel");
    fireEvent.click(showBtn);
    expect(leftPanel).toHaveClass("w-72");
  });

  it("should toggle right panel", () => {
    render(<PageBuilderLayout />, { wrapper });
    
    const rightPanel = screen.getByTestId("component-settings-panel").parentElement!.parentElement!;
    expect(rightPanel).toHaveClass("w-80");
    
    const hideBtn = screen.getByLabelText("Hide right panel");
    fireEvent.click(hideBtn);
    expect(rightPanel).toHaveClass("w-0");
    
    const showBtn = screen.getByLabelText("Show right panel");
    fireEvent.click(showBtn);
    expect(rightPanel).toHaveClass("w-80");
  });
});
