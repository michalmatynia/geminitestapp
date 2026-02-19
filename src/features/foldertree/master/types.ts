import type {
  MasterFolderTreePersistOperationDto,
  MasterFolderTreeDragStateDto,
  MasterFolderTreeUndoEntryDto,
  MasterFolderTreeErrorDto,
  MasterFolderTreePersistContextDto,
  MasterFolderTreeActionFailDto,
  MasterFolderTreeActionResultDto,
  MasterFolderTreeActionOkDto,
  UseMasterFolderTreeOptionsDto,
} from '@/shared/contracts/master-folder-tree';
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

export type MasterFolderTreePersistOperation = MasterFolderTreePersistOperationDto;

export type MasterFolderTreePersistContext = MasterFolderTreePersistContextDto & {
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

export type MasterFolderTreeDragState = MasterFolderTreeDragStateDto;

export type MasterFolderTreeUndoEntry = MasterFolderTreeUndoEntryDto;

export type MasterFolderTreeUndoLogEntry = {
  label: string;
  createdAt: number;
};

export type MasterFolderTreeError = MasterFolderTreeErrorDto;

export type MasterFolderTreeActionOk = MasterFolderTreeActionOkDto;

export type MasterFolderTreeActionFail = MasterFolderTreeActionFailDto;

export type MasterFolderTreeActionResult = MasterFolderTreeActionResultDto;

export type UseMasterFolderTreeOptions = UseMasterFolderTreeOptionsDto & {
  profile?: FolderTreeProfileV2 | undefined;
  adapter?: MasterFolderTreeAdapter | undefined;
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
  undoHistory: MasterFolderTreeUndoLogEntry[];
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

export const toMasterFolderTreeActionFail = (
  code: MasterTreeDropRejectionReason | string
): MasterFolderTreeActionFail => ({
  ok: false,
  code,
});
