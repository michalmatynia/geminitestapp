
import { render, screen, fireEvent, act } from "@testing-library/react";
import FileManager from "@/features/files/components/FileManager";
import { useFiles, useDeleteFile, useUpdateFileTags } from "@/features/files/hooks/useFiles";
import { vi } from "vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/features/files/hooks/useFiles", () => ({
  useFiles: vi.fn(),
  useDeleteFile: vi.fn(),
  useUpdateFileTags: vi.fn(),
}));

vi.mock("@/shared/ui", async () => {
  const actual = await vi.importActual("@/shared/ui");
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
    FilePreviewModal: ({ children, onClose }: any) => (
      <div data-testid="preview-modal">
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ),
  };
});

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

describe("FileManager Component", () => {
  const mockFiles = [
    {
      id: "file-1",
      filename: "image1.jpg",
      filepath: "/uploads/image1.jpg",
      products: [{ product: { id: "p1", name: "Product 1" } }],
      tags: ["nature"],
    },
    {
      id: "file-2",
      filename: "image2.png",
      filepath: "/uploads/image2.png",
      products: [],
      tags: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useFiles as any).mockReturnValue({ data: mockFiles, isLoading: false });
    (useDeleteFile as any).mockReturnValue({ mutateAsync: vi.fn() });
    (useUpdateFileTags as any).mockReturnValue({ mutateAsync: vi.fn() });
  });

  it("should render the file list", () => {
    render(<FileManager />, { wrapper });
    expect(screen.getAllByText("image1.jpg").length).toBeGreaterThan(0);
    expect(screen.getAllByText("image2.png").length).toBeGreaterThan(0);
    expect(screen.getByText("Product 1")).toBeInTheDocument();
  });

  it("should handle single file selection", () => {
    const onSelectFile = vi.fn();
    render(<FileManager onSelectFile={onSelectFile} selectionMode="single" autoConfirmSelection={true} />, { wrapper });
    
    const file1 = screen.getByAltText("image1.jpg");
    fireEvent.click(file1);
    
    expect(onSelectFile).toHaveBeenCalledWith([{ id: "file-1", filepath: "/uploads/image1.jpg" }]);
  });

  it("should handle multiple file selection and confirmation", () => {
    const onSelectFile = vi.fn();
    render(<FileManager onSelectFile={onSelectFile} selectionMode="multiple" />, { wrapper });
    
    const file1 = screen.getByAltText("image1.jpg");
    const file2 = screen.getByAltText("image2.png");
    
    fireEvent.click(file1);
    fireEvent.click(file2);
    
    const confirmBtn = screen.getByText(/Confirm Selection \(2\)/i);
    fireEvent.click(confirmBtn);
    
    expect(onSelectFile).toHaveBeenCalledWith([
      { id: "file-1", filepath: "/uploads/image1.jpg" },
      { id: "file-2", filepath: "/uploads/image2.png" },
    ]);
  });

  it("should open preview modal when View is clicked", () => {
    render(<FileManager mode="view" />, { wrapper });
    
    const viewButtons = screen.getAllByText("View");
    fireEvent.click(viewButtons[0]!);
    
    expect(screen.getByTestId("preview-modal")).toBeInTheDocument();
    expect(screen.getByText("Linked Products")).toBeInTheDocument();
  });

  it("should call delete mutation when X is clicked and confirmed", () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    (useDeleteFile as any).mockReturnValue({ mutateAsync: mockDelete });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<FileManager />, { wrapper });
    
    const deleteButtons = screen.getAllByText("X");
    act(() => {
      fireEvent.click(deleteButtons[0]!);
    });
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith("file-1");
  });

  it("should filter files by search input", () => {
    render(<FileManager />, { wrapper });
    const searchInput = screen.getByPlaceholderText("Search by filename");
    fireEvent.change(searchInput, { target: { value: "test" } });
    expect(searchInput).toHaveValue("test");
  });
});
