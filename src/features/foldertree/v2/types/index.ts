import type {
  MasterFolderTreeActionResult,
  MasterFolderTreeError,
  MasterFolderTreePersistOperation,
  MasterTreeCanDropResultDto,
  MasterFolderTreeUndoEntry,
} from '@/shared/contracts/master-folder-tree';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
  MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';

export type FolderTreePersistOperationV3 = MasterFolderTreePersistOperation;

export type FolderTreeTransaction = {
  id: string;
  instanceId?: string | undefined;
  version: number;
  createdAt: number;
  operation: FolderTreePersistOperationV3;
  previousNodes: MasterTreeNode[];
  nextNodes: MasterTreeNode[];
};

export type FolderTreePreparedTransaction = {
  tx: FolderTreeTransaction;
  preparedAt: number;
  context?: Record<string, unknown> | undefined;
};

export type FolderTreeAppliedTransaction = {
  tx: FolderTreeTransaction;
  appliedAt: number;
  nodes?: MasterTreeNode[] | undefined;
  version?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export interface MasterFolderTreeAdapterV3 {
  fetchState?: (
    instanceId?: string
  ) => Promise<{
    nodes: MasterTreeNode[];
    version?: number | undefined;
  }>;
  prepare?: (
    tx: FolderTreeTransaction
  ) => Promise<FolderTreePreparedTransaction>;
  apply: (
    tx: FolderTreeTransaction,
    prepared: FolderTreePreparedTransaction
  ) => Promise<FolderTreeAppliedTransaction | void>;
  commit?: (
    tx: FolderTreeTransaction,
    applied: FolderTreeAppliedTransaction
  ) => Promise<void>;
  rollback?: (
    tx: FolderTreeTransaction,
    stage: 'prepare' | 'apply' | 'commit',
    reason: unknown
  ) => Promise<void>;
}

export type FolderTreeState = {
  nodes: MasterTreeNode[];
  selectedNodeId: MasterTreeId | null;
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
