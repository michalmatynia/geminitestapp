import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Folder Tree DTOs
 */

export interface FolderTreeNodeDto {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  path: string;
  size: number | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
  children: FolderTreeNodeDto[];
}

export const folderTreeNodeSchema: z.ZodType<FolderTreeNodeDto> = dtoBaseSchema.extend({
  name: z.string(),
  type: z.enum(['folder', 'file']),
  parentId: z.string().nullable(),
  path: z.string(),
  size: z.number().nullable(),
  mimeType: z.string().nullable(),
  children: z.array(z.lazy(() => folderTreeNodeSchema)),
});

export const createFolderSchema = z.object({
  name: z.string(),
  type: z.enum(['folder', 'file']),
  parentId: z.string().nullable(),
  path: z.string(),
  size: z.number().nullable(),
  mimeType: z.string().nullable(),
});

export type CreateFolderDto = z.infer<typeof createFolderSchema>;
export type UpdateFolderDto = Partial<CreateFolderDto>;

export const moveFolderSchema = z.object({
  id: z.string(),
  newParentId: z.string().nullable(),
});

export type MoveFolderDto = z.infer<typeof moveFolderSchema>;

export const folderTreeStatsSchema = z.object({
  totalFolders: z.number(),
  totalFiles: z.number(),
  totalSize: z.number(),
  maxDepth: z.number(),
});

export type FolderTreeStatsDto = z.infer<typeof folderTreeStatsSchema>;
