import type { MasterTreeNode, MasterTreeId } from '@/shared/utils/master-folder-tree-engine';

export type MasterFolderTreeError = {
  message: string;
  code?: string;
  details?: unknown;
};

export type MasterFolderTreeActionResult = {
  success: boolean;
  error?: MasterFolderTreeError;
};

export type MasterFolderTreePersistOperation = 'create' | 'update' | 'delete' | 'move' | 'refresh';

export type MasterFolderTreeUndoEntry = {
  operation: MasterFolderTreePersistOperation;
  nodes: MasterTreeNode[];
};

export interface MasterFolderTreeController {
  nodes: MasterTreeNode[];
  selectedIds: Set<MasterTreeId>;
  expandedIds: Set<MasterTreeId>;
  isProcessing: boolean;
  canUndo: boolean;
  toggleExpand: (id: MasterTreeId) => void;
  toggleSelect: (id: MasterTreeId, multi?: boolean) => void;
  createFolder: (name?: string) => Promise<MasterFolderTreeActionResult>;
  renameNode: (id: MasterTreeId, name: string) => Promise<MasterFolderTreeActionResult>;
  deleteNodes: (ids: MasterTreeId[]) => Promise<MasterFolderTreeActionResult>;
  moveNode: (id: MasterTreeId, targetParentId: MasterTreeId | null, targetIndex?: number) => Promise<MasterFolderTreeActionResult>;
  refresh: () => Promise<MasterFolderTreeActionResult>;
  undo: () => Promise<MasterFolderTreeActionResult>;
}

export interface UseMasterFolderTreeOptions {
  adapter?: any;
  initialExpandedIds?: MasterTreeId[];
  onAction?: (action: MasterFolderTreePersistOperation, result: MasterFolderTreeActionResult) => void;
}

export function toMasterFolderTreeActionFail(message: string, code?: string): MasterFolderTreeActionResult {
  return {
    success: false,
    error: { message, code },
  };
}
