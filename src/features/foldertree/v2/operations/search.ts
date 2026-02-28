import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { getAncestorIds } from './expansion';

export type MasterTreeSearchMatchField = 'name' | 'path' | 'metadata';

export type MasterTreeSearchMatch = {
  nodeId: MasterTreeId;
  matchField: MasterTreeSearchMatchField;
  score: number;
};

export type MasterTreeSearchMatchMode = 'contains' | 'starts_with' | 'exact';

export type MasterTreeSearchOptions = {
  /** Maximum number of results. Default: unlimited. */
  maxResults?: number | undefined;
  /** Which node fields to search. Default: ['name']. */
  fields?: MasterTreeSearchMatchField[] | undefined;
  /** How the query must match. Default: 'contains'. */
  matchMode?: MasterTreeSearchMatchMode | undefined;
};

const matchesQuery = (value: string, query: string, mode: MasterTreeSearchMatchMode): boolean => {
  const v = value.toLowerCase();
  const q = query.toLowerCase();
  switch (mode) {
    case 'starts_with':
      return v.startsWith(q);
    case 'exact':
      return v === q;
    case 'contains':
    default:
      return v.includes(q);
  }
};

/**
 * Search nodes for the given query. Returns matches sorted by relevance (name match first).
 */
export const searchMasterTreeNodes = (
  nodes: MasterTreeNode[],
  query: string,
  options?: MasterTreeSearchOptions | undefined
): MasterTreeSearchMatch[] => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const fields: MasterTreeSearchMatchField[] = options?.fields ?? ['name'];
  const mode: MasterTreeSearchMatchMode = options?.matchMode ?? 'contains';
  const maxResults = options?.maxResults;

  const results: MasterTreeSearchMatch[] = [];

  for (const node of nodes) {
    let matched = false;
    let matchField: MasterTreeSearchMatchField = 'name';
    let score = 0;

    for (const field of fields) {
      if (field === 'name' && matchesQuery(node.name, trimmed, mode)) {
        matched = true;
        matchField = 'name';
        // Exact match scores highest, starts_with next, contains last
        score = mode === 'exact' ? 100 : mode === 'starts_with' ? 75 : 50;
        break;
      }
      if (field === 'path' && matchesQuery(node.path, trimmed, mode)) {
        matched = true;
        matchField = 'path';
        score = 25;
        break;
      }
      if (field === 'metadata' && node.metadata) {
        const metaStr = JSON.stringify(node.metadata).toLowerCase();
        if (metaStr.includes(trimmed.toLowerCase())) {
          matched = true;
          matchField = 'metadata';
          score = 10;
          break;
        }
      }
    }

    if (matched) {
      results.push({ nodeId: node.id, matchField, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return maxResults !== undefined ? results.slice(0, maxResults) : results;
};

/**
 * Given a set of search matches, returns the subset of nodes that should be
 * visible (matched nodes plus all their ancestors) and the ancestor IDs that
 * must be expanded to show those nodes.
 */
export const filterMasterTreeToMatches = (
  nodes: MasterTreeNode[],
  matches: MasterTreeSearchMatch[]
): {
  filteredNodes: MasterTreeNode[];
  expandedNodeIds: MasterTreeId[];
} => {
  if (matches.length === 0) {
    return { filteredNodes: [], expandedNodeIds: [] };
  }

  const matchedNodeIds = new Set(matches.map((m) => m.nodeId));
  const expandedSet = new Set<MasterTreeId>();
  const visibleSet = new Set<MasterTreeId>(matchedNodeIds);

  for (const nodeId of matchedNodeIds) {
    const ancestors = getAncestorIds(nodes, nodeId);
    for (const ancestorId of ancestors) {
      expandedSet.add(ancestorId);
      visibleSet.add(ancestorId);
    }
  }

  const filteredNodes = nodes.filter((n) => visibleSet.has(n.id));
  return {
    filteredNodes,
    expandedNodeIds: Array.from(expandedSet),
  };
};
