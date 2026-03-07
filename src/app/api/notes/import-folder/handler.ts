import { NextRequest, NextResponse } from 'next/server';

import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import {
  noteFolderImportRequestSchema,
  type NoteFolderImportNodeDto,
  type NoteFolderImportResponseDto,
} from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

async function createFolderStructure(
  node: NoteFolderImportNodeDto,
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
  const parsed = await parseJsonBody(req, noteFolderImportRequestSchema, {
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

  const response: NoteFolderImportResponseDto = {
    success: true,
    message: 'Folder structure imported successfully',
    categoriesCreated: categoryMap.size,
  };

  return NextResponse.json(response);
}
