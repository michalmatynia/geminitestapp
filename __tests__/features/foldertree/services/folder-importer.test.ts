import { describe, it, expect } from "vitest";
import { countFolderStructure, countMultipleFolders, type FolderNode } from "@/features/foldertree/utils/folderImporter";

describe("folderImporter utils", () => {
  const mockNode: FolderNode = {
    name: "Root",
    path: "Root",
    children: [
      {
        name: "Sub",
        path: "Root/Sub",
        children: [],
        notes: [
          { title: "Note 1", content: "C1", path: "Root/Sub/Note 1.md" }
        ]
      }
    ],
    notes: [
      { title: "Root Note", content: "CR", path: "Root/Root Note.md" }
    ]
  };

  describe("countFolderStructure", () => {
    it("counts folders and notes correctly", () => {
      const result = countFolderStructure(mockNode);
      expect(result.folders).toBe(2);
      expect(result.notes).toBe(2);
    });

    it("counts empty folder", () => {
      const emptyNode: FolderNode = { name: "E", path: "E", children: [], notes: [] };
      const result = countFolderStructure(emptyNode);
      expect(result.folders).toBe(1);
      expect(result.notes).toBe(0);
    });
  });

  describe("countMultipleFolders", () => {
    it("sums up counts from multiple nodes", () => {
      const result = countMultipleFolders([mockNode, mockNode]);
      expect(result.folders).toBe(4);
      expect(result.notes).toBe(4);
    });
  });
});
