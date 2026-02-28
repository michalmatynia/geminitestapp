import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

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
  structures: FolderNode[];
}

const noteImportSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().default(''),
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

const importSchema: z.ZodSchema<ImportRequest> = z.object({
  notebookId: z.string().trim().min(1),
  parentFolderId: z.string().trim().min(1).nullable().optional(),
  structures: z.array(folderNodeSchema).min(1),
});

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
    themeId: null,
    color: null,
    sortIndex: null,
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
      color: null,
      tagIds: [],
      editorType: 'markdown',
      relatedNoteIds: [],
    });
  }

  // Recursively create subfolders
  for (const child of node.children) {
    await createFolderStructure(child, notebookId, category.id, categoryMap);
  }
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, importSchema, {
    logPrefix: 'notes.import-folder',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { notebookId, parentFolderId, structures } = parsed.data;

  const categoryMap = new Map<string, string>();

  for (const folderStructure of structures) {
    await createFolderStructure(folderStructure, notebookId, parentFolderId || null, categoryMap);
  }

  return NextResponse.json({
    success: true,
    message: 'Folder structure imported successfully',
    categoriesCreated: categoryMap.size,
  });
}
