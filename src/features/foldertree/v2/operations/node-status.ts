import type { MasterTreeNodeStatus } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const VALID_NODE_STATUSES = new Set<string>(['loading', 'error', 'locked', 'warning', 'success']);

/**
 * Reads `node.metadata['_status']` and returns the typed status value, or null
 * if the field is absent or holds an unrecognized value.
 *
 * Convention: set `node.metadata['_status'] = 'loading' | 'error' | 'locked' | 'warning' | 'success'`
 * to have the default row renderer and consumers display a status indicator automatically.
 */
export function getMasterTreeNodeStatus(node: MasterTreeNode): MasterTreeNodeStatus | null {
  const status = node.metadata?.['_status'];
  if (typeof status === 'string' && VALID_NODE_STATUSES.has(status)) {
    return status as MasterTreeNodeStatus;
  }
  return null;
}
