import type { FolderTreeProfileV2 } from '@/shared/utils/folder-tree-profiles-v2';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
  MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';
import type {
  MasterTreeCanDropResult,
  MasterTreeDropRejectionReason,
  MasterTreeValidationIssue,
  MasterTreeViewNode,
} from '@/shared/utils/master-folder-tree-engine';

export type MasterFolderTreePersistOperation =
  | {
      type: 'move';
      nodeId: MasterTreeId;
      targetParentId: MasterTreeId | null;
      targetIndex?: number | undefined;
    }
  | {
      type: 'reorder';
      nodeId: MasterTreeId;
      targetId: MasterTreeId;
      position: Exclude<MasterTreeDropPosition, 'inside'>;
    }
  | {
      type: 'rename';
      nodeId: MasterTreeId;
      name: string;
    }
  | {
      type: 'replace_nodes';
      nodes: MasterTreeNode[];
      reason: 'undo' | 'refresh' | 'external_sync';
    };

export type MasterFolderTreePersistContext = {
  previousNodes: MasterTreeNode[];
  nextNodes: MasterTreeNode[];
  profile?: FolderTreeProfileV2 | undefined;
};

export type MasterFolderTreeAdapter = {
  loadNodes?: (() => Promise<MasterTreeNode[]>) | undefined;
  applyOperation?:
    | ((
        operation: MasterFolderTreePersistOperation,
        context: MasterFolderTreePersistContext
      ) => Promise<MasterTreeNode[] | void> | MasterTreeNode[] | void)
    | undefined;
};

export type MasterFolderTreeDragState = {
  draggedNodeId: MasterTreeId;
  targetId: MasterTreeId | null;
  position: MasterTreeDropPosition;
};

export type MasterFolderTreeUndoEntry = {
  label: string;
  createdAt: number;
  nodes: MasterTreeNode[];
  selectedNodeId: MasterTreeId | null;
  expandedNodeIds: MasterTreeId[];
};

export type MasterFolderTreeError = {
  code: string;
  message: string;
  operationType: MasterFolderTreePersistOperation['type'] | 'unknown';
  at: string;
  cause?: unknown;
};

export type MasterFolderTreeActionOk = {
  ok: true;
};

export type MasterFolderTreeActionFail = {
  ok: false;
  code: string;
};

export type MasterFolderTreeActionResult =
  | MasterFolderTreeActionOk
  | MasterFolderTreeActionFail;

export type UseMasterFolderTreeOptions = {
  initialNodes: MasterTreeNode[];
  initialSelectedNodeId?: MasterTreeId | null | undefined;
  initiallyExpandedNodeIds?: MasterTreeId[] | undefined;
  profile?: FolderTreeProfileV2 | undefined;
  adapter?: MasterFolderTreeAdapter | undefined;
  maxUndoEntries?: number | undefined;
  externalRevision?: string | number | undefined;
};

export type MasterFolderTreeController = {
  nodes: MasterTreeNode[];
  roots: MasterTreeViewNode[];
  validationIssues: MasterTreeValidationIssue[];
  selectedNodeId: MasterTreeId | null;
  selectedNode: MasterTreeNode | null;
  expandedNodeIds: Set<MasterTreeId>;
  renamingNodeId: MasterTreeId | null;
  renameDraft: string;
  dragState: MasterFolderTreeDragState | null;
  canUndo: boolean;
  undoHistory: Array<{ label: string; createdAt: number }>;
  isApplying: boolean;
  lastError: MasterFolderTreeError | null;
  canDropNode: (
    nodeId: MasterTreeId,
    targetId: MasterTreeId | null,
    position?: MasterTreeDropPosition | undefined
  ) => MasterTreeCanDropResult;
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
  commitRename: (name?: string | undefined) => Promise<MasterFolderTreeActionResult>;
  startDrag: (nodeId: MasterTreeId) => void;
  updateDragTarget: (targetId: MasterTreeId | null, position?: MasterTreeDropPosition | undefined) => void;
  clearDrag: () => void;
  dropDraggedNode: (
    targetId: MasterTreeId | null,
    position?: MasterTreeDropPosition | undefined
  ) => Promise<MasterFolderTreeActionResult>;
  moveNode: (
    nodeId: MasterTreeId,
    targetParentId: MasterTreeId | null,
    targetIndex?: number | undefined
  ) => Promise<MasterFolderTreeActionResult>;
  reorderNode: (
    nodeId: MasterTreeId,
    targetId: MasterTreeId,
    position: Exclude<MasterTreeDropPosition, 'inside'>
  ) => Promise<MasterFolderTreeActionResult>;
  dropNodeToRoot: (
    nodeId: MasterTreeId,
    targetIndex?: number | undefined
  ) => Promise<MasterFolderTreeActionResult>;
  replaceNodes: (
    nodes: MasterTreeNode[],
    reason?: 'refresh' | 'external_sync' | undefined
  ) => Promise<MasterFolderTreeActionResult>;
  refreshFromAdapter: () => Promise<MasterFolderTreeActionResult>;
  undo: () => Promise<MasterFolderTreeActionResult>;
  clearError: () => void;
};

export const toMasterFolderTreeActionFail = (
  code: MasterTreeDropRejectionReason | string
): MasterFolderTreeActionFail => ({
  ok: false,
  code,
});
