import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Asset3DEditModal } from "@/features/viewer3d/components/Asset3DEditModal";
import type { Asset3DRecord } from "@/features/viewer3d/types";
import { updateAsset3D } from "@/features/viewer3d/api";

vi.mock("@/features/viewer3d/api", () => ({
  updateAsset3D: vi.fn(),
}));

const mockAsset: Asset3DRecord = {
  id: "1",
  name: "Original Name",
  description: "Original Description",
  filename: "model.glb",
  filepath: "/path.glb",
  mimetype: "model/gltf-binary",
  size: 1024,
  tags: ["tag1"],
  category: "Category 1",
  isPublic: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: null,
};

describe("Asset3DEditModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    asset: mockAsset,
    onSave: vi.fn(),
    existingCategories: ["Cat A", "Cat B"],
    existingTags: ["tag A", "tag B"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with initial asset data", () => {
    render(<Asset3DEditModal {...defaultProps} />);

    expect(screen.getByDisplayValue("Original Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Original Description")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Category 1")).toBeInTheDocument();
    expect(screen.getByText("tag1")).toBeInTheDocument();
  });

  it("should allow adding and removing tags", () => {
    render(<Asset3DEditModal {...defaultProps} />);

    const tagInput = screen.getByPlaceholderText("Add tag...");
    fireEvent.change(tagInput, { target: { value: "newtag" } });
    fireEvent.keyDown(tagInput, { key: "Enter", code: "Enter" });

    expect(screen.getByText("newtag")).toBeInTheDocument();

    const removeButton = screen.getByText("tag1").querySelector("button");
    fireEvent.click(removeButton!);

    expect(screen.queryByText("tag1")).not.toBeInTheDocument();
  });

  it("should call updateAsset3D and onSave when clicking save", async () => {
    const updatedAsset = { ...mockAsset, name: "Updated Name" };
    vi.mocked(updateAsset3D).mockResolvedValue(updatedAsset);

    render(<Asset3DEditModal {...defaultProps} />);

    const nameInput = screen.getByDisplayValue("Original Name");
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });

    const saveButton = screen.getByText("Save Changes");
    fireEvent.click(saveButton);

    await waitFor(() => expect(updateAsset3D).toHaveBeenCalled());
    expect(updateAsset3D).toHaveBeenCalledWith(mockAsset.id, expect.objectContaining({
      name: "Updated Name",
    }));
    expect(defaultProps.onSave).toHaveBeenCalledWith(updatedAsset);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should display error message if save fails", async () => {
    vi.mocked(updateAsset3D).mockRejectedValue(new Error("API Error"));

    render(<Asset3DEditModal {...defaultProps} />);

    const saveButton = screen.getByText("Save Changes");
    fireEvent.click(saveButton);

    await waitFor(() => expect(screen.getByText("API Error")).toBeInTheDocument());
  });
});
