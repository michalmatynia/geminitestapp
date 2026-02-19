import { z } from 'zod';

/**
 * Master Folder Tree DTOs
 */

export const masterTreeNodeTypeSchema = z.enum(['folder', 'file']);
export type MasterTreeNodeTypeDto = z.infer<typeof masterTreeNodeTypeSchema>;

export const masterTreeTargetTypeSchema = z.enum(['folder', 'root']);
export type MasterTreeTargetTypeDto = z.infer<typeof masterTreeTargetTypeSchema>;

export const masterTreeDropPositionSchema = z.enum(['inside', 'before', 'after']);
export type MasterTreeDropPositionDto = z.infer<typeof masterTreeDropPositionSchema>;

export const masterTreeNodeSchema = z.object({
  id: z.string(),
  type: masterTreeNodeTypeSchema,
  kind: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  path: z.string(),
  sortOrder: z.number(),
  icon: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type MasterTreeNodeDto = z.infer<typeof masterTreeNodeSchema>;

export const masterFolderTreePersistOperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('move'),
    nodeId: z.string(),
    targetParentId: z.string().nullable(),
    targetIndex: z.number().optional(),
  }),
  z.object({
    type: z.literal('reorder'),
    nodeId: z.string(),
    targetId: z.string(),
    position: z.enum(['before', 'after']),
  }),
  z.object({
    type: z.literal('rename'),
    nodeId: z.string(),
    name: z.string(),
  }),
  z.object({
    type: z.literal('replace_nodes'),
    nodes: z.array(masterTreeNodeSchema),
    reason: z.enum(['undo', 'refresh', 'external_sync']),
  }),
]);

export type MasterFolderTreePersistOperationDto = z.infer<typeof masterFolderTreePersistOperationSchema>;

export const masterFolderTreeDragStateSchema = z.object({
  draggedNodeId: z.string(),
  targetId: z.string().nullable(),
  position: masterTreeDropPositionSchema,
});

export type MasterFolderTreeDragStateDto = z.infer<typeof masterFolderTreeDragStateSchema>;

export const masterFolderTreeUndoEntrySchema = z.object({
  label: z.string(),
  createdAt: z.number(),
  nodes: z.array(masterTreeNodeSchema),
  selectedNodeId: z.string().nullable(),
  expandedNodeIds: z.array(z.string()),
});

export type MasterFolderTreeUndoEntryDto = z.infer<typeof masterFolderTreeUndoEntrySchema>;

export const masterFolderTreeErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  operationType: z.string(),
  at: z.string(),
  cause: z.unknown().optional(),
});

export type MasterFolderTreeErrorDto = z.infer<typeof masterFolderTreeErrorSchema>;
