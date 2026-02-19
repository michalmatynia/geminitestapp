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

export const masterTreeViewNodeSchema: z.ZodType<MasterTreeViewNodeDto> = masterTreeNodeSchema.extend({
  children: z.array(z.lazy(() => masterTreeViewNodeSchema)),
});

export type MasterTreeViewNodeDto = MasterTreeNodeDto & {
  children: MasterTreeViewNodeDto[];
};

export const masterTreeValidationIssueCodeSchema = z.enum([
  'DUPLICATE_ID',
  'MISSING_PARENT',
  'CYCLE_DETECTED',
]);

export type MasterTreeValidationIssueCodeDto = z.infer<typeof masterTreeValidationIssueCodeSchema>;

export const masterTreeValidationIssueSchema = z.object({
  code: masterTreeValidationIssueCodeSchema,
  nodeId: z.string(),
  message: z.string(),
});

export type MasterTreeValidationIssueDto = z.infer<typeof masterTreeValidationIssueSchema>;

export const masterTreeBuildResultSchema = z.object({
  roots: z.array(masterTreeViewNodeSchema),
  issues: z.array(masterTreeValidationIssueSchema),
});

export type MasterTreeBuildResultDto = z.infer<typeof masterTreeBuildResultSchema>;

export const masterTreeCycleGuardResultSchema = z.object({
  hasCycle: z.boolean(),
  cycleNodeIds: z.array(z.string()),
});

export type MasterTreeCycleGuardResultDto = z.infer<typeof masterTreeCycleGuardResultSchema>;

export const masterTreeDropRejectionReasonSchema = z.enum([
  'NODE_NOT_FOUND',
  'TARGET_NOT_FOUND',
  'TARGET_NOT_FOLDER',
  'TARGET_IS_SELF',
  'TARGET_IN_SUBTREE',
  'PROFILE_RULE_BLOCKED',
]);

export type MasterTreeDropRejectionReasonDto = z.infer<typeof masterTreeDropRejectionReasonSchema>;

export const masterTreeCanDropResultSchema = z.object({
  ok: z.boolean(),
  reason: masterTreeDropRejectionReasonSchema.optional(),
  resolvedParentId: z.string().nullable(),
});

export type MasterTreeCanDropResultDto = z.infer<typeof masterTreeCanDropResultSchema>;

export const masterTreeMutationErrorCodeSchema = z.union([
  masterTreeDropRejectionReasonSchema,
  z.literal('TARGET_PARENT_NOT_FOUND'),
]);

export type MasterTreeMutationErrorCodeDto = z.infer<typeof masterTreeMutationErrorCodeSchema>;

export const masterTreeMutationResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    nodes: z.array(masterTreeNodeSchema),
  }),
  z.object({
    ok: z.literal(false),
    code: masterTreeMutationErrorCodeSchema,
    nodes: z.array(masterTreeNodeSchema),
  }),
]);

export type MasterTreeMutationResultDto = z.infer<typeof masterTreeMutationResultSchema>;

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

export const masterFolderTreePersistContextSchema = z.object({
  previousNodes: z.array(masterTreeNodeSchema),
  nextNodes: z.array(masterTreeNodeSchema),
});

export type MasterFolderTreePersistContextDto = z.infer<typeof masterFolderTreePersistContextSchema>;

export const masterFolderTreeActionOkSchema = z.object({
  ok: z.literal(true),
});

export type MasterFolderTreeActionOkDto = z.infer<typeof masterFolderTreeActionOkSchema>;

export const masterFolderTreeActionFailSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
});

export type MasterFolderTreeActionFailDto = z.infer<typeof masterFolderTreeActionFailSchema>;

export const masterFolderTreeActionResultSchema = z.discriminatedUnion('ok', [
  masterFolderTreeActionOkSchema,
  masterFolderTreeActionFailSchema,
]);

export type MasterFolderTreeActionResultDto = z.infer<typeof masterFolderTreeActionResultSchema>;

export const useMasterFolderTreeOptionsSchema = z.object({
  initialNodes: z.array(masterTreeNodeSchema),
  initialSelectedNodeId: z.string().nullable().optional(),
  initiallyExpandedNodeIds: z.array(z.string()).optional(),
  maxUndoEntries: z.number().optional(),
  externalRevision: z.union([z.string(), z.number()]).optional(),
});

export type UseMasterFolderTreeOptionsDto = z.infer<typeof useMasterFolderTreeOptionsSchema>;
