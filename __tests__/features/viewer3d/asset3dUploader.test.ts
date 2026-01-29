import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadAsset3D, deleteAsset3D } from "@/features/viewer3d/utils/asset3dUploader";
import fs from "fs/promises";
import { prismaAsset3DRepository } from "@/features/viewer3d/services/asset3d-repository/prisma-asset3d-repository";

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/features/viewer3d/services/asset3d-repository/prisma-asset3d-repository", () => ({
  prismaAsset3DRepository: {
    createAsset3D: vi.fn(),
    getAsset3DById: vi.fn(),
    deleteAsset3D: vi.fn(),
  },
}));

describe("asset3dUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadAsset3D", () => {
    it("should upload a valid file and save to repository", async () => {
      const file = new File(["content"], "test.glb", { type: "model/gltf-binary" });
      // jsdom might not have arrayBuffer on File
      if (!file.arrayBuffer) {
        file.arrayBuffer = async () => new ArrayBuffer(8);
      }
      const mockResult = { id: "1", filename: "test.glb" };
      vi.mocked(prismaAsset3DRepository.createAsset3D).mockResolvedValue(mockResult as any);

      const result = await uploadAsset3D(file, { name: "Test Asset" });

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(prismaAsset3DRepository.createAsset3D).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Asset",
          filename: expect.stringContaining("test.glb"),
          size: file.size,
        })
      );
      expect(result).toEqual(mockResult);
    });

    it("should throw error for invalid file type", async () => {
      const file = new File(["content"], "test.txt", { type: "text/plain" });
      await expect(uploadAsset3D(file)).rejects.toThrow("Invalid 3D asset file type");
    });
  });

  describe("deleteAsset3D", () => {
    it("should delete file from disk and database", async () => {
      const mockAsset = { id: "1", filepath: "/uploads/assets3d/test.glb" };
      vi.mocked(prismaAsset3DRepository.getAsset3DById).mockResolvedValue(mockAsset as any);
      vi.mocked(prismaAsset3DRepository.deleteAsset3D).mockResolvedValue(mockAsset as any);

      const result = await deleteAsset3D("1");

      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalled();
      expect(prismaAsset3DRepository.deleteAsset3D).toHaveBeenCalledWith("1");
    });

    it("should return false if asset not found", async () => {
      vi.mocked(prismaAsset3DRepository.getAsset3DById).mockResolvedValue(null);

      const result = await deleteAsset3D("non-existent");

      expect(result).toBe(false);
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });
});
