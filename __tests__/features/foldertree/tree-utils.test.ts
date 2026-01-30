import { describe, it, expect } from "vitest";
import { findFolderById, findFolderParentId } from "@/features/foldertree/utils/tree";
import type { CategoryWithChildren } from "@/shared/types/notes";

const mockFolders: CategoryWithChildren[] = [
  {
    id: "f1",
    name: "Folder 1",
    children: [
      {
        id: "f1.1",
        name: "Folder 1.1",
        children: [],
        _count: { notes: 0 },
        notes: [],
      },
    ],
    _count: { notes: 0 },
    notes: [],
  },
  {
    id: "f2",
    name: "Folder 2",
    children: [],
    _count: { notes: 0 },
    notes: [],
  },
];

describe("foldertree utils", () => {
  describe("findFolderById", () => {
    it("finds a top-level folder", () => {
      const result = findFolderById(mockFolders, "f1");
      expect(result?.id).toBe("f1");
      expect(result?.name).toBe("Folder 1");
    });

    it("finds a nested folder", () => {
      const result = findFolderById(mockFolders, "f1.1");
      expect(result?.id).toBe("f1.1");
      expect(result?.name).toBe("Folder 1.1");
    });

    it("returns null if folder not found", () => {
      const result = findFolderById(mockFolders, "non-existent");
      expect(result).toBeNull();
    });
  });

  describe("findFolderParentId", () => {
    it("returns null for top-level folder", () => {
      const result = findFolderParentId(mockFolders, "f1");
      expect(result).toBeNull();
    });

    it("returns parent id for nested folder", () => {
      const result = findFolderParentId(mockFolders, "f1.1");
      expect(result).toBe("f1");
    });

    it("returns null if folder not found", () => {
      const result = findFolderParentId(mockFolders, "non-existent");
      expect(result).toBeNull();
    });
  });
});
