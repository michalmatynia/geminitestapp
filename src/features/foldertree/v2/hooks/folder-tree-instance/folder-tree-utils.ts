import {
  toMasterFolderTreeActionFail,
  type MasterFolderTreeActionResult,
  type MasterFolderTreePersistOperation,
  type UseMasterFolderTreeOptions,
} from '@/shared/contracts/master-folder-tree';
import { normalizeNodesV2 } from '@/features/foldertree/v2/core/engine';
import type {
  FolderTreeAppliedTransaction,
  FolderTreeState,
  FolderTreeTransaction,
} from '../../types';

export const toActionOk = (): MasterFolderTreeActionResult => ({
  success: true,
  ok: true,
});

export const createErrorAction = (code: string, message?: string): MasterFolderTreeActionResult =>
  toMasterFolderTreeActionFail(message ?? code, code);

export const areNodesEqual = (
  left: ReadonlyArray<FolderTreeState['nodes'][number]>,
  right: ReadonlyArray<FolderTreeState['nodes'][number]>
): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftNode = left[index];
    const rightNode = right[index];
    if (!leftNode || !rightNode) return false;
    if (leftNode.id !== rightNode.id) return false;
    if (leftNode.type !== rightNode.type) return false;
    if (leftNode.kind !== rightNode.kind) return false;
    if ((leftNode.parentId ?? null) !== (rightNode.parentId ?? null)) return false;
    if (leftNode.name !== rightNode.name) return false;
    if (leftNode.path !== rightNode.path) return false;
    if (leftNode.sortOrder !== rightNode.sortOrder) return false;
  }
  return true;
};

export const cloneNodes = (nodes: FolderTreeState['nodes']): FolderTreeState['nodes'] =>
  nodes.map((node) => ({ ...node }));

export const cloneUndoStack = (entries: FolderTreeState['undoStack']): FolderTreeState['undoStack'] =>
  entries.map((entry) => ({
    ...entry,
    nodes: cloneNodes(entry.nodes),
    expandedNodeIds: [...entry.expandedNodeIds],
  }));

export const createInitialState = (options: UseMasterFolderTreeOptions): FolderTreeState => {
  const normalizedNodes = normalizeNodesV2(options.initialNodes);
  const validNodeIds = new Set(normalizedNodes.map((node) => node.id));
  const initialExpandedNodeIds = Array.from(
    new Set((options.initiallyExpandedNodeIds ?? []).map((id) => id.trim()).filter(Boolean))
  ).filter((id) => validNodeIds.has(id));

  return {
    nodes: normalizedNodes,
    selectedNodeId:
      options.initialSelectedNodeId && validNodeIds.has(options.initialSelectedNodeId)
        ? options.initialSelectedNodeId
        : null,
    selectedNodeIds: [],
    expandedNodeIds: initialExpandedNodeIds,
    renamingNodeId: null,
    renameDraft: '',
    dragState: null,
    undoStack: [],
    isApplying: false,
    lastError: null,
    version: 1,
  };
};

export const toUndoEntry = (
  state: FolderTreeState,
  label: string
): FolderTreeState['undoStack'][number] => ({
  label,
  createdAt: Date.now(),
  nodes: cloneNodes(state.nodes),
  selectedNodeId: state.selectedNodeId,
  expandedNodeIds: [...state.expandedNodeIds],
});

export const createTxId = (): string =>
  `mftx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const createAppliedTx = (tx: FolderTreeTransaction): FolderTreeAppliedTransaction => ({
  tx,
  appliedAt: Date.now(),
});

export const normalizeError = (
  operationType: MasterFolderTreePersistOperation['type'] | 'unknown',
  error: unknown
): NonNullable<FolderTreeState['lastError']> => ({
  code: 'PERSIST_FAILED',
  message: error instanceof Error ? error.message : 'Failed to persist tree operation.',
  operationType,
  at: new Date().toISOString(),
  ...(error instanceof Error ? { cause: error } : {}),
});

export const isConflictError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const maybeCode = (error as { code?: unknown }).code;
  if (typeof maybeCode === 'string' && maybeCode.toLowerCase().includes('conflict')) {
    return true;
  }
  const maybeMessage = (error as { message?: unknown }).message;
  if (typeof maybeMessage === 'string' && maybeMessage.toLowerCase().includes('conflict')) {
    return true;
  }
  return false;
};

export const withUndoEntry = (
  state: FolderTreeState,
  label: string,
  maxUndoEntries: number
): FolderTreeState['undoStack'] => {
  const next = [...state.undoStack, toUndoEntry(state, label)];
  if (next.length <= maxUndoEntries) return next;
  return next.slice(next.length - maxUndoEntries);
};
