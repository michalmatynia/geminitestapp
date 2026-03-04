import { z } from 'zod';

export const FOLDER_TREE_UI_STATE_V2_KEY_PREFIX = 'folder_tree_ui_state::';
export const FOLDER_TREE_PROFILE_V2_KEY_PREFIX = 'folder_tree_profile::';

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
export type MasterTreeNode = MasterTreeNodeDto;
export type MasterTreeId = string;

export const masterTreeViewNodeSchema: z.ZodType<MasterTreeViewNodeDto> =
  masterTreeNodeSchema.extend({
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

export type MasterFolderTreePersistOperationDto = z.infer<
  typeof masterFolderTreePersistOperationSchema
>;
export type MasterFolderTreePersistOperation = MasterFolderTreePersistOperationDto;

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
export type MasterFolderTreeUndoEntry = MasterFolderTreeUndoEntryDto;

export const masterFolderTreeErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  operationType: z.string(),
  at: z.string(),
  cause: z.unknown().optional(),
});

export type MasterFolderTreeErrorDto = z.infer<typeof masterFolderTreeErrorSchema>;
export type MasterFolderTreeError = MasterFolderTreeErrorDto;

export const masterFolderTreePersistContextSchema = z.object({
  previousNodes: z.array(masterTreeNodeSchema),
  nextNodes: z.array(masterTreeNodeSchema),
});

export type MasterFolderTreePersistContextDto = z.infer<
  typeof masterFolderTreePersistContextSchema
>;

export interface MasterFolderTreePersistContext {
  previousNodes: MasterTreeNode[];
  nextNodes: MasterTreeNode[];
  profile?: FolderTreeProfileV2 | undefined;
}

export type MasterFolderTreeTransaction = {
  id: string;
  instanceId?: string | undefined;
  version: number;
  createdAt: number;
  operation: MasterFolderTreePersistOperation;
  previousNodes: MasterTreeNode[];
  nextNodes: MasterTreeNode[];
};

export type MasterFolderTreePreparedTransaction = {
  tx: MasterFolderTreeTransaction;
  preparedAt: number;
  context?: Record<string, unknown> | undefined;
};

export type MasterFolderTreeAppliedTransaction = {
  tx: MasterFolderTreeTransaction;
  appliedAt: number;
  nodes?: MasterTreeNode[] | undefined;
  version?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export interface MasterFolderTreeAdapterV3 {
  fetchState?: (instanceId?: string) => Promise<{
    nodes: MasterTreeNode[];
    version?: number | undefined;
  }>;
  prepare: (tx: MasterFolderTreeTransaction) => Promise<MasterFolderTreePreparedTransaction>;
  apply: (
    tx: MasterFolderTreeTransaction,
    prepared: MasterFolderTreePreparedTransaction
  ) => Promise<MasterFolderTreeAppliedTransaction | void>;
  commit: (
    tx: MasterFolderTreeTransaction,
    applied: MasterFolderTreeAppliedTransaction
  ) => Promise<void>;
  rollback: (
    tx: MasterFolderTreeTransaction,
    stage: 'prepare' | 'apply' | 'commit',
    reason: unknown
  ) => Promise<void>;
}

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
export type MasterFolderTreeActionResult = {
  success: boolean;
  ok: boolean;
  error?: { message: string; code?: string; details?: unknown };
};

export type MasterFolderTreeSearchResult = {
  node: MasterTreeNode;
};

export type DecodedMasterTreeNode<TEntity extends string = string> = {
  entity: TEntity;
  id: string;
  nodeId: MasterTreeId;
};

export type MoveOperation = Extract<MasterFolderTreePersistOperation, { type: 'move' }>;
export type ReorderOperation = Extract<MasterFolderTreePersistOperation, { type: 'reorder' }>;
export type RenameOperation = Extract<MasterFolderTreePersistOperation, { type: 'rename' }>;
export type ReplaceNodesOperation = Extract<
  MasterFolderTreePersistOperation,
  { type: 'replace_nodes' }
>;

export type CreateMasterFolderTreeAdapterOptions<TEntity extends string> = {
  decodeNodeId: (nodeId: MasterTreeId) => DecodedMasterTreeNode<TEntity> | null;
  fetchState?:
    | ((instanceId?: string) => Promise<{ nodes: MasterTreeNode[]; version?: number | undefined }>)
    | undefined;
  handlers?: {
    onMove?:
      | ((input: {
          operation: MoveOperation;
          context: MasterFolderTreePersistContext;
          node: DecodedMasterTreeNode<TEntity>;
          targetParent: DecodedMasterTreeNode<TEntity> | null;
        }) => Promise<MasterTreeNode[] | void> | MasterTreeNode[] | void)
      | undefined;
    onReorder?:
      | ((input: {
          operation: ReorderOperation;
          context: MasterFolderTreePersistContext;
          node: DecodedMasterTreeNode<TEntity>;
          target: DecodedMasterTreeNode<TEntity>;
        }) => Promise<MasterTreeNode[] | void> | MasterTreeNode[] | void)
      | undefined;
    onRename?:
      | ((input: {
          operation: RenameOperation;
          context: MasterFolderTreePersistContext;
          node: DecodedMasterTreeNode<TEntity>;
          nextName: string;
        }) => Promise<MasterTreeNode[] | void> | MasterTreeNode[] | void)
      | undefined;
    onReplaceNodes?:
      | ((input: {
          operation: ReplaceNodesOperation;
          context: MasterFolderTreePersistContext;
        }) => Promise<MasterTreeNode[] | void> | MasterTreeNode[] | void)
      | undefined;
  };
};

/**
 * Master Folder Tree Profile DTOs
 */
export type FolderTreePlaceholderPreset = 'sublime' | 'classic' | 'vivid';
export type FolderTreePlaceholderStyle = 'line' | 'pill' | 'ghost';
export type FolderTreePlaceholderEmphasis = 'subtle' | 'balanced' | 'bold';
export type FolderTreeSelectionBehavior = 'click_away' | 'toggle_only';
export type FolderTreeIconSlot = 'folderClosed' | 'folderOpen' | 'file' | 'root' | 'dragHandle';

export type FolderTreeNestingRuleV2 = {
  childType: MasterTreeNodeTypeDto;
  childKinds: string[];
  targetType: MasterTreeTargetTypeDto;
  targetKinds: string[];
  allow: boolean;
};

/** Semantic status that can be attached to any node via node.metadata['_status']. */
export type MasterTreeNodeStatus = 'loading' | 'error' | 'locked' | 'warning' | 'success';

export type FolderTreeBadgeSpec = {
  /** Which data to display. 'children_count' shows folder child count; 'custom' uses metadata['_badge']. */
  field: 'children_count' | 'custom';
  /** Where the badge is rendered relative to the node label. */
  position: 'inline_after_name' | 'trailing';
  /** Visual style of the badge. */
  style: 'count' | 'dot' | 'status_icon';
  /** Maps metadata status values to semantic colors. Only used when style = 'status_icon'. */
  statusMap?: Record<string, 'info' | 'warning' | 'error' | 'success'> | undefined;
};

export type FolderTreeKeyboardConfig = {
  /** Enable keyboard navigation for this instance. Default true. */
  enabled: boolean;
  /** Arrow key navigation between nodes. Default true. */
  arrowNavigation: boolean;
  /** Enter key starts rename on selected node. Default true. */
  enterToRename: boolean;
  /** Delete/Backspace emits request_delete for selected node. Default false. */
  deleteKey: boolean;
};

export type FolderTreeMultiSelectConfig = {
  /** Enable multi-selection for this instance. Default false. */
  enabled: boolean;
  /** Ctrl/Cmd+click toggles a node in/out of selection. Default true. */
  ctrlClick: boolean;
  /** Shift+click selects a range. Default true. */
  shiftClick: boolean;
  /** Ctrl/Cmd+A selects all visible nodes. Default true. */
  selectAll: boolean;
};

export type FolderTreeSearchConfig = {
  /** Show a built-in search bar. Default false. */
  enabled: boolean;
  /** Debounce delay in ms for search input. Default 200. */
  debounceMs: number;
  /** 'highlight' shows all nodes; 'filter_tree' hides non-matching branches. Default 'highlight'. */
  filterMode: 'highlight' | 'filter_tree';
  /** Which node fields to search. Default ['name']. */
  matchFields: Array<'name' | 'path' | 'metadata'>;
  /** Minimum query length before searching. Default 1. */
  minQueryLength: number;
};

export type FolderTreeProfileV2 = {
  version: 2;
  placeholders: {
    preset: FolderTreePlaceholderPreset;
    style: FolderTreePlaceholderStyle;
    emphasis: FolderTreePlaceholderEmphasis;
    rootDropLabel: string;
    inlineDropLabel: string;
  };
  icons: {
    slots: Record<FolderTreeIconSlot, string | null>;
    byKind: Record<string, string | null>;
  };
  nesting: {
    defaultAllow: boolean;
    blockedTargetKinds: string[];
    rules: FolderTreeNestingRuleV2[];
  };
  interactions: {
    selectionBehavior: FolderTreeSelectionBehavior;
  };
  // Optional capability sections — all new consumers can opt-in via these
  /** Badge display configuration. Undefined = no badges. */
  badges?: FolderTreeBadgeSpec | undefined;
  /** Keyboard navigation configuration. Undefined = use defaults. */
  keyboard?: Partial<FolderTreeKeyboardConfig> | undefined;
  /** Multi-selection configuration. Undefined = disabled. */
  multiSelect?: Partial<FolderTreeMultiSelectConfig> | undefined;
  /** Built-in search/filter configuration. Undefined = disabled. */
  search?: Partial<FolderTreeSearchConfig> | undefined;
  /**
   * Icon IDs (from the project's icon registry) to display per node status in the default row renderer.
   * Nodes set their status via metadata['_status']. Undefined = no status icons shown.
   */
  statusIcons?: Partial<Record<MasterTreeNodeStatus, string | null>> | undefined;
};

export const useMasterFolderTreeOptionsSchema = z.object({
  instanceId: z.string().optional(),
  initialNodes: z.array(masterTreeNodeSchema),
  initialSelectedNodeId: z.string().nullable().optional(),
  initiallyExpandedNodeIds: z.array(z.string()).optional(),
  maxUndoEntries: z.number().optional(),
  externalRevision: z.union([z.string(), z.number()]).optional(),
});

export type UseMasterFolderTreeOptionsDto = z.infer<typeof useMasterFolderTreeOptionsSchema>;
export interface UseMasterFolderTreeOptions {
  instanceId?: string | undefined;
  profile?: FolderTreeProfileV2 | undefined;
  adapter?: MasterFolderTreeAdapterV3 | undefined;
  initialNodes: MasterTreeNode[];
  initialSelectedNodeId?: MasterTreeId | null;
  initiallyExpandedNodeIds?: MasterTreeId[];
  maxUndoEntries?: number;
  externalRevision?: string | number;
}

export interface MasterFolderTreeController {
  nodes: MasterTreeNode[];
  roots: MasterTreeViewNodeDto[];
  validationIssues: MasterTreeValidationIssueDto[];
  selectedNodeId: MasterTreeId | null;
  selectedNode: MasterTreeNode | null;
  expandedNodeIds: Set<MasterTreeId>;
  renamingNodeId: MasterTreeId | null;
  renameDraft: string;
  dragState: MasterFolderTreeDragStateDto | null;
  canUndo: boolean;
  undoHistory: { label: string; createdAt: number }[];
  isApplying: boolean;
  lastError: MasterFolderTreeError | null;
  canDropNode: (
    nodeId: MasterTreeId,
    targetId: MasterTreeId | null,
    position?: MasterTreeDropPositionDto
  ) => MasterTreeCanDropResultDto;
  selectNode: (nodeId: MasterTreeId | null) => void;
  setExpandedNodeIds: (nodeIds: MasterTreeId[]) => void;
  toggleNodeExpanded: (nodeId: MasterTreeId) => void;
  expandNode: (nodeId: MasterTreeId) => void;
  collapseNode: (nodeId: MasterTreeId) => void;
  expandAll: () => void;
  collapseAll: () => void;
  startRename: (nodeId: MasterTreeId) => void;
  updateRenameDraft: (value: string) => void;
  cancelRename: () => void;
  commitRename: (name?: string) => Promise<MasterFolderTreeActionResult>;
  startDrag: (nodeId: MasterTreeId) => void;
  updateDragTarget: (targetId: MasterTreeId | null, position?: MasterTreeDropPositionDto) => void;
  clearDrag: () => void;
  dropDraggedNode: (
    targetId: MasterTreeId | null,
    position?: MasterTreeDropPositionDto
  ) => Promise<MasterFolderTreeActionResult>;
  moveNode: (
    nodeId: MasterTreeId,
    targetParentId: MasterTreeId | null,
    targetIndex?: number
  ) => Promise<MasterFolderTreeActionResult>;
  reorderNode: (
    nodeId: MasterTreeId,
    targetId: MasterTreeId,
    position: 'before' | 'after'
  ) => Promise<MasterFolderTreeActionResult>;
  dropNodeToRoot: (
    nodeId: MasterTreeId,
    targetIndex?: number
  ) => Promise<MasterFolderTreeActionResult>;
  replaceNodes: (
    nodes: MasterTreeNode[],
    reason?: 'refresh' | 'external_sync'
  ) => Promise<MasterFolderTreeActionResult>;
  refreshFromAdapter: () => Promise<MasterFolderTreeActionResult>;
  undo: () => Promise<MasterFolderTreeActionResult>;
  clearError: () => void;
  /** Expands all ancestor nodes of the given node so it becomes visible in the tree. */
  expandToNode?: ((nodeId: MasterTreeId) => void) | undefined;
  /** Programmatically scroll the viewport to bring a node into view. Requires scrollToNodeRef on FolderTreeViewportV2. */
  scrollToNode?: ((nodeId: MasterTreeId) => void) | undefined;
  // --- Multi-selection (optional; available when multiSelect is enabled in profile) ---
  /** Set of currently multi-selected node IDs. Empty set means no multi-selection. */
  selectedNodeIds?: Set<MasterTreeId> | undefined;
  /** Toggle a single node in/out of the multi-selection. */
  toggleSelectNode?: ((nodeId: MasterTreeId) => void) | undefined;
  /** Select a contiguous range of visible nodes from anchorId to nodeId. */
  selectNodeRange?:
    | ((anchorId: MasterTreeId, nodeId: MasterTreeId, visibleNodeIds: MasterTreeId[]) => void)
    | undefined;
  /** Select all nodes in the tree. */
  selectAllNodes?: (() => void) | undefined;
  /** Clear the multi-selection (does not affect selectedNodeId). */
  clearMultiSelection?: (() => void) | undefined;
  /** Replace the multi-selection with the given IDs. */
  setSelectedNodeIds?: ((nodeIds: MasterTreeId[]) => void) | undefined;
}

export function toMasterFolderTreeActionFail(
  message: string,
  code?: string
): MasterFolderTreeActionResult {
  return {
    success: false,
    ok: false,
    error: { message, code },
  };
}
