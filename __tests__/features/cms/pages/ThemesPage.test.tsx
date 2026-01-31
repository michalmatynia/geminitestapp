
import { render, screen, fireEvent } from "@testing-library/react";
import ThemesPage from "@/features/cms/pages/themes/ThemesPage";
import { useCmsThemes, useDeleteTheme } from "@/features/cms/hooks/useCmsQueries";
import { useRouter } from "next/navigation";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock hooks
vi.mock("@/features/cms/hooks/useCmsQueries", () => ({
  useCmsThemes: vi.fn(),
  useDeleteTheme: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("ThemesPage Component", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useDeleteTheme as any).mockReturnValue({ mutateAsync: vi.fn() });
  });

  it("should render empty state when no themes exist", () => {
    (useCmsThemes as any).mockReturnValue({ data: [], isLoading: false });
    render(<ThemesPage />);
    expect(screen.getByText("No themes yet.")).toBeInTheDocument();
  });

  it("should render themes list", () => {
    const mockThemes = [
      { id: "t1", name: "Modern Dark", colors: { primary: "#000" } },
      { id: "t2", name: "Minimal Light", colors: { primary: "#fff" } },
    ];
    (useCmsThemes as any).mockReturnValue({ data: mockThemes, isLoading: false });
    
    render(<ThemesPage />);
    expect(screen.getByText("Modern Dark")).toBeInTheDocument();
    expect(screen.getByText("Minimal Light")).toBeInTheDocument();
  });

  it("should navigate to create page when button is clicked", () => {
    (useCmsThemes as any).mockReturnValue({ data: [], isLoading: false });
    render(<ThemesPage />);
    
    const createBtn = screen.getByRole("button", { name: /Create Theme/i });
    fireEvent.click(createBtn);
    
    expect(mockPush).toHaveBeenCalledWith("/admin/cms/themes/create");
  });

  it("should handle theme deletion", () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    (useDeleteTheme as any).mockReturnValue({ mutateAsync: mockDelete });
    (useCmsThemes as any).mockReturnValue({ 
      data: [{ id: "t1", name: "Dark", colors: { p: "#000" } }], 
      isLoading: false 
    });
    
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ThemesPage />);
    
    const deleteBtn = screen.getByRole("button", { name: /Delete/i });
    fireEvent.click(deleteBtn);
    
    expect(window.confirm).toHaveBeenCalledWith("Delete this theme?");
    expect(mockDelete).toHaveBeenCalledWith("t1");
  });
});
