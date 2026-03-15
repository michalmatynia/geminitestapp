import { DRAG_KEYS } from '@/shared/utils/drag-drop';
import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const MASTER_TREE_DRAG_NODE_ID = 'application/x-master-tree-node-id';

export const setMasterTreeDragNodeData = (
  dataTransfer: DataTransfer,
  nodeId: MasterTreeId,
  textFallback?: string
): void => {
  const normalizedNodeId = nodeId.trim();
  if (!normalizedNodeId) return;

  const textValue = (textFallback ?? normalizedNodeId).trim();

  try {
    dataTransfer.setData(MASTER_TREE_DRAG_NODE_ID, normalizedNodeId);
    if (textValue.length > 0) {
      dataTransfer.setData(DRAG_KEYS.TEXT, textValue);
    }
  } catch (error) {
    logClientError(error);
  
    // Some browsers/tools can throw for unsupported dataTransfer operations.
  }
};

export const getMasterTreeDragNodeData = (
  dataTransfer: DataTransfer | null
): MasterTreeId | null => {
  if (!dataTransfer) return null;

  try {
    const value = dataTransfer.getData(MASTER_TREE_DRAG_NODE_ID);
    if (typeof value !== 'string') return null;
    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  } catch (error) {
    logClientError(error);
    return null;
  }
};
