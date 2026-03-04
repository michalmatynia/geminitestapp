'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  FolderTreeProfileV2,
  MasterFolderTreeSearchResult,
} from '@/shared/contracts/master-folder-tree';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import {
  resolveFolderTreeSearchConfig,
  type ResolvedFolderTreeSearchConfig,
} from '@/shared/utils/folder-tree-profiles-v2';

import { filterMasterTreeToMatches, searchMasterTreeNodes } from '../operations/search';

export type { MasterFolderTreeSearchResult };

export type MasterFolderTreeSearchState = {
  query: string;
  effectiveQuery: string;
  isActive: boolean;
  config: ResolvedFolderTreeSearchConfig;
  matchNodeIds: Set<MasterTreeId>;
  results: MasterFolderTreeSearchResult[];
  filteredNodes: MasterTreeNode[];
  filteredExpandedNodeIds: MasterTreeId[];
};

export type UseMasterFolderTreeSearchOptions = {
  profile?: FolderTreeProfileV2 | undefined;
  config?: ResolvedFolderTreeSearchConfig | undefined;
};

const mapMatchesToResults = (
  nodesById: Map<MasterTreeId, MasterTreeNode>,
  nodeIds: MasterTreeId[]
): MasterFolderTreeSearchResult[] =>
  nodeIds
    .map((nodeId: MasterTreeId): MasterTreeNode | null => nodesById.get(nodeId) ?? null)
    .filter((node: MasterTreeNode | null): node is MasterTreeNode => Boolean(node))
    .map((node: MasterTreeNode): MasterFolderTreeSearchResult => ({ node }));

export function useMasterFolderTreeSearch(
  nodes: MasterTreeNode[],
  query: string,
  options?: UseMasterFolderTreeSearchOptions | undefined
): MasterFolderTreeSearchState {
  const resolvedConfig = useMemo(
    (): ResolvedFolderTreeSearchConfig =>
      options?.config ?? resolveFolderTreeSearchConfig(options?.profile),
    [options?.config, options?.profile]
  );

  const [debouncedQuery, setDebouncedQuery] = useState<string>(query);
  useEffect(() => {
    const delay = Math.max(0, resolvedConfig.debounceMs);
    if (delay === 0) {
      setDebouncedQuery(query);
      return;
    }

    const timerId = window.setTimeout((): void => {
      setDebouncedQuery(query);
    }, delay);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [query, resolvedConfig.debounceMs]);

  return useMemo((): MasterFolderTreeSearchState => {
    const nodesById = new Map(
      nodes.map((node: MasterTreeNode): [MasterTreeId, MasterTreeNode] => [node.id, node])
    );
    const effectiveQuery = debouncedQuery.trim();
    const isActive =
      resolvedConfig.enabled &&
      effectiveQuery.length > 0 &&
      effectiveQuery.length >= resolvedConfig.minQueryLength;

    if (!isActive) {
      return {
        query,
        effectiveQuery,
        isActive: false,
        config: resolvedConfig,
        matchNodeIds: new Set<MasterTreeId>(),
        results: [],
        filteredNodes: nodes,
        filteredExpandedNodeIds: [],
      };
    }

    const matches = searchMasterTreeNodes(nodes, effectiveQuery, {
      fields: resolvedConfig.matchFields,
    });
    const matchedNodeIds = matches.map((match): MasterTreeId => match.nodeId);
    const matchNodeIds = new Set<MasterTreeId>(matchedNodeIds);
    const results = mapMatchesToResults(nodesById, matchedNodeIds);

    if (resolvedConfig.filterMode === 'filter_tree') {
      const filtered = filterMasterTreeToMatches(nodes, matches);
      return {
        query,
        effectiveQuery,
        isActive: true,
        config: resolvedConfig,
        matchNodeIds,
        results,
        filteredNodes: filtered.filteredNodes,
        filteredExpandedNodeIds: filtered.expandedNodeIds,
      };
    }

    return {
      query,
      effectiveQuery,
      isActive: true,
      config: resolvedConfig,
      matchNodeIds,
      results,
      filteredNodes: nodes,
      filteredExpandedNodeIds: [],
    };
  }, [debouncedQuery, nodes, query, resolvedConfig]);
}
