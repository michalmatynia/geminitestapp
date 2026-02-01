import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PageBuilderLayout } from "@/features/cms/components/page-builder/PageBuilderLayout";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePageBuilder } from "@/features/cms/hooks/usePageBuilderContext";

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
  ComponentTreePanel: () => {
    const { dispatch } = usePageBuilder();
    return (
      <div data-testid="component-tree-panel">
        Tree
        <button aria-label="Hide left panel" onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}>Hide</button>
      </div>
    );
  },
}));

vi.mock("@/features/cms/components/page-builder/PagePreviewPanel", () => ({
  PagePreviewPanel: () => <div data-testid="page-preview-panel">Preview</div>,
}));

vi.mock("@/features/cms/components/page-builder/ComponentSettingsPanel", () => ({
  ComponentSettingsPanel: () => {
    const { dispatch } = usePageBuilder();
    return (
      <div data-testid="component-settings-panel">
        Settings
        <button aria-label="Hide right panel" onClick={() => dispatch({ type: "TOGGLE_RIGHT_PANEL" })}>Hide</button>
      </div>
    );
  },
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

  it("should toggle left panel", async () => {
    render(<PageBuilderLayout />, { wrapper });
    
    // The animated container is the grandparent of the tree panel's content wrapper
    const leftPanel = screen.getAllByLabelText("Hide left panel")[0]!.closest('.transition-all')!;
    expect(leftPanel).toHaveClass("w-72");
    
    const hideBtn = screen.getAllByLabelText("Hide left panel")[0]!;
    await act(async () => {
      fireEvent.click(hideBtn);
    });
    await waitFor(() => expect(leftPanel).toHaveClass("w-0"));
    
    // Click again to show
    const showBtn = screen.getByLabelText("Show left panel");
    await act(async () => {
      fireEvent.click(showBtn);
    });
    await waitFor(() => expect(leftPanel).toHaveClass("w-72"));
  });

  it("should toggle right panel", async () => {
    render(<PageBuilderLayout />, { wrapper });
    
    // ComponentSettingsPanel is rendered inside the right panel container
    const rightPanel = screen.getByTestId("component-settings-panel").parentElement!;
    expect(rightPanel).toHaveClass("w-80");
    
    const hideBtn = screen.getByLabelText("Hide right panel");
    await act(async () => {
      fireEvent.click(hideBtn);
    });
    await waitFor(() => expect(rightPanel).toHaveClass("w-0"));
    
    const showBtn = screen.getByLabelText("Show right panel");
    await act(async () => {
      fireEvent.click(showBtn);
    });
    await waitFor(() => expect(rightPanel).toHaveClass("w-80"));
  });

  it("should switch left panel modes", async () => {
    render(<PageBuilderLayout />, { wrapper });
    
    // Default is sections
    expect(screen.getByText("Sections")).toBeInTheDocument();
    expect(screen.getByTestId("component-tree-panel")).toBeInTheDocument();
    
    // Switch to theme
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Theme settings"));
    });
    expect(screen.getByText("Theme settings")).toBeInTheDocument();
    expect(screen.getByTestId("theme-settings-panel")).toBeInTheDocument();
    
    // Switch to menu
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Menu settings"));
    });
    expect(screen.getByText("Menu settings")).toBeInTheDocument();
    expect(screen.getByTestId("menu-settings-panel")).toBeInTheDocument();

    // Switch to app embeds
    await act(async () => {
      fireEvent.click(screen.getByLabelText("App embeds"));
    });
    expect(screen.getByText("App embeds")).toBeInTheDocument();
    expect(screen.getByTestId("app-embeds-panel")).toBeInTheDocument();
    
    // Switch back to sections
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Back to sections"));
    });
    expect(screen.getByText("Sections")).toBeInTheDocument();
    expect(screen.getByTestId("component-tree-panel")).toBeInTheDocument();
  });

  it("should handle responsive auto-collapse of right panel", async () => {
    // Mock matchMedia
    let matches = false;
    let changeHandler: ((e: any) => void) | null = null;
    
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn().mockImplementation((event, handler) => {
        if (event === "change") changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<PageBuilderLayout />, { wrapper });
    
    const rightPanel = screen.getByTestId("component-settings-panel").parentElement!;
    expect(rightPanel).toHaveClass("w-80"); // Initially open
    
    // Simulate narrow screen
    matches = true;
    await act(async () => {
      if (changeHandler) changeHandler({ matches: true });
    });
    
    await waitFor(() => expect(rightPanel).toHaveClass("w-0"));
    
    // Simulate wide screen again
    matches = false;
    await act(async () => {
      if (changeHandler) changeHandler({ matches: false });
    });
    await waitFor(() => expect(rightPanel).toHaveClass("w-80"));
  });
});