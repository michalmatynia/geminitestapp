export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { noteService } from "@/features/notesapp/server";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

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
  parentFolderId?: string | null | undefined;
  structure?: FolderNode | undefined;
  structures?: FolderNode[] | undefined;
}

const noteImportSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().default(""),
  path: z.string().trim().min(1),
});

const folderNodeSchema: z.ZodType<FolderNode> = z.lazy(() =>
  z.object({
    name: z.string().trim().min(1),
    path: z.string().trim().min(1),
    children: z.array(folderNodeSchema).optional().default([]),
    notes: z.array(noteImportSchema).optional().default([]),
  })
);

const importSchema: z.ZodSchema<ImportRequest> = z
  .object({
    notebookId: z.string().trim().min(1),
    parentFolderId: z.string().trim().min(1).nullable().optional(),
    structure: folderNodeSchema.optional(),
    structures: z.array(folderNodeSchema).optional(),
  })
  .refine(
    (data) =>
      Boolean(data.structure) ||
      Boolean(data.structures && data.structures.length > 0),
    {
      message: "Missing required field: structure or structures",
      path: ["structures"],
    }
  );

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

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, importSchema, {
    logPrefix: "notes.import-folder",
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { notebookId, parentFolderId, structure, structures } = parsed.data;

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
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "notes.import-folder.POST" });
