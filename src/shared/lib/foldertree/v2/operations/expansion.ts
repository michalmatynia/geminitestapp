import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

/**
 * Returns the ancestor node IDs of a given node, ordered from immediate parent to root.
 * Cycle-safe: stops if a parent ID is visited more than once.
 */
export const getAncestorIds = (nodes: MasterTreeNode[], nodeId: MasterTreeId): MasterTreeId[] => {
  const byId = new Map<MasterTreeId, MasterTreeNode>(nodes.map((n) => [n.id, n]));
  const ancestors: MasterTreeId[] = [];
  const seen = new Set<MasterTreeId>();
  let cursor: MasterTreeId | null = byId.get(nodeId)?.parentId ?? null;
  while (cursor !== null && !seen.has(cursor)) {
    seen.add(cursor);
    ancestors.push(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }
  return ancestors;
};
