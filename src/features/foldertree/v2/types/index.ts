import type {
  MasterFolderTreeActionResult,
  MasterFolderTreeError,
  MasterFolderTreePersistOperation,
  MasterTreeCanDropResultDto,
  MasterFolderTreeUndoEntry,
  MasterFolderTreeTransaction,
  MasterFolderTreeAppliedTransaction,
  MasterFolderTreePreparedTransaction,
  MasterFolderTreeAdapterV3,
} from '@/shared/contracts/master-folder-tree';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
  MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';

export type FolderTreePersistOperationV3 = MasterFolderTreePersistOperation;
export type FolderTreeTransaction = MasterFolderTreeTransaction;
export type FolderTreePreparedTransaction = MasterFolderTreePreparedTransaction;
export type FolderTreeAppliedTransaction = MasterFolderTreeAppliedTransaction;

export type { MasterFolderTreeAdapterV3 };

export type FolderTreeState = {
  nodes: MasterTreeNode[];
  selectedNodeId: MasterTreeId | null;
  /** Multi-selected node IDs. Empty array means no multi-selection active. */
  selectedNodeIds: MasterTreeId[];
  expandedNodeIds: MasterTreeId[];
  renamingNodeId: MasterTreeId | null;
  renameDraft: string;
  dragState: {
    draggedNodeId: MasterTreeId;
    targetId: MasterTreeId | null;
    position: MasterTreeDropPosition;
  } | null;
  undoStack: MasterFolderTreeUndoEntry[];
  isApplying: boolean;
  lastError: MasterFolderTreeError | null;
  version: number;
};

export type FolderTreeMutationSlice = {
  canUndo: boolean;
  actionResult: MasterFolderTreeActionResult;
};

export type FolderTreeNodeView = {
  nodeId: MasterTreeId;
  depth: number;
  parentId: MasterTreeId | null;
  hasChildren: boolean;
  isExpanded: boolean;
};

export type FolderTreeDropCheck = MasterTreeCanDropResultDto;

export type FolderTreeStoreSnapshot = {
  state: FolderTreeState;
  rootsVersion: number;
};
