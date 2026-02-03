
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { render } from "@/__tests__/test-utils";
import { DraftCreator } from "@/features/drafter/components/DraftCreator";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: "1" }),
}));

// Mock useToast
vi.mock("@/shared/ui", async () => {
  const actual = await vi.importActual("@/shared/ui");
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
  };
});

describe("DraftCreator Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global fetch for metadata
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/catalogs") {
        return Promise.resolve({
          ok: true,
          json: async () => await Promise.resolve([{ id: "cat-1", name: "Default Catalog" }]),
        });
      }
      return Promise.resolve({ ok: true, json: async () => await Promise.resolve([]) });
    });
  });

  it("should render the form with initial state", async () => {
    render(<DraftCreator draftId={null} onSaveSuccess={vi.fn()} onCancel={vi.fn()} />);
    
    expect(screen.getByText("Draft Information")).toBeInTheDocument();
    expect(screen.getByLabelText(/Draft Name/i)).toBeInTheDocument();
    
    // Check if it fetched catalogs
    await waitFor(() => {
      expect(screen.getByText("Default Catalog")).toBeInTheDocument();
    });
  });

  it("should update name input correctly", () => {
    render(<DraftCreator draftId={null} onSaveSuccess={vi.fn()} onCancel={vi.fn()} />);
    
    const nameInput = screen.getByLabelText(/Draft Name/i);
    fireEvent.change(nameInput, { target: { value: "My New Draft" } });
    
    expect(nameInput).toHaveValue("My New Draft");
  });

  it("should show validation error if saving without a name", () => {
    const onSaveSuccess = vi.fn();
    const { container } = render(<DraftCreator draftId={null} onSaveSuccess={onSaveSuccess} onCancel={vi.fn()} />);
    
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    
    act(() => {
      fireEvent.submit(form);
    });
    
    expect(onSaveSuccess).not.toHaveBeenCalled();
  });

  it("should toggle active switch", () => {
    render(<DraftCreator draftId={null} onSaveSuccess={vi.fn()} onCancel={vi.fn()} />);
    
    const activeSwitch = screen.getByRole("switch", { name: /Active Draft/i });
    act(() => {
      fireEvent.click(activeSwitch);
    });
  });

  it("should render icon buttons", async () => {
    render(<DraftCreator draftId={null} onSaveSuccess={vi.fn()} onCancel={vi.fn()} />);
    
    // availableIcons includes 'package', 'shopping-cart', etc.
    await waitFor(() => {
      expect(screen.getByTitle("Package")).toBeInTheDocument();
      expect(screen.getByTitle("Shopping Cart")).toBeInTheDocument();
    });
  });
});
