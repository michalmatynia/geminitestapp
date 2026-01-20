import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService";

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  notes: NoteImport[];
}

interface NoteImport {
  title: string;
  content: string;
  path: string;
}

interface ImportRequest {
  notebookId: string;
  parentFolderId?: string | null;
  structure?: FolderNode;
  structures?: FolderNode[];
}

async function createFolderStructure(
  node: FolderNode,
  notebookId: string,
  parentId: string | null,
  categoryMap: Map<string, string>
): Promise<void> {
  // Create the folder
  const category = await noteService.createCategory({
    name: node.name,
    parentId,
    notebookId,
  });

  categoryMap.set(node.path, category.id);

  // Create notes in this folder
  for (const noteData of node.notes) {
    await noteService.create({
      title: noteData.title,
      content: noteData.content,
      categoryIds: [category.id],
      notebookId,
      isPinned: false,
      isArchived: false,
      isFavorite: false,
    });
  }

  // Recursively create subfolders
  for (const child of node.children) {
    await createFolderStructure(child, notebookId, category.id, categoryMap);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ImportRequest = await req.json();
    const { notebookId, parentFolderId, structure, structures } = body;

    if (!notebookId) {
      return NextResponse.json(
        { error: "Missing required field: notebookId" },
        { status: 400 }
      );
    }

    if (!structure && (!structures || structures.length === 0)) {
      return NextResponse.json(
        { error: "Missing required field: structure or structures" },
        { status: 400 }
      );
    }

    const categoryMap = new Map<string, string>();

    // Handle multiple folders
    if (structures && structures.length > 0) {
      for (const folderStructure of structures) {
        await createFolderStructure(
          folderStructure,
          notebookId,
          parentFolderId || null,
          categoryMap
        );
      }
    }
    // Handle single folder (backward compatibility)
    else if (structure) {
      await createFolderStructure(
        structure,
        notebookId,
        parentFolderId || null,
        categoryMap
      );
    }

    return NextResponse.json({
      success: true,
      message: "Folder structure imported successfully",
      categoriesCreated: categoryMap.size,
    });
  } catch (error) {
    console.error("Failed to import folder structure:", error);
    return NextResponse.json(
      { error: "Failed to import folder structure" },
      { status: 500 }
    );
  }
}
