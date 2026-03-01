import { useMemo } from 'react';
import type { MasterTreeNode, MasterFolderTreeSearchResult } from '@/shared/contracts/master-folder-tree';

export type { MasterFolderTreeSearchResult };

export function useMasterFolderTreeSearch(
  nodes: MasterTreeNode[],
  query: string
): { results: MasterFolderTreeSearchResult[]; isActive: boolean } {
  const trimmed = query.trim();
  const isActive = trimmed.length > 0;

  const results = useMemo((): MasterFolderTreeSearchResult[] => {
    if (!isActive) return [];
    const normalized = trimmed.toLowerCase();
    const matched = nodes.filter(
      (node: MasterTreeNode): boolean =>
        node.name.toLowerCase().includes(normalized) || node.path.toLowerCase().includes(normalized)
    );
    matched.sort((a: MasterTreeNode, b: MasterTreeNode): number => a.name.localeCompare(b.name));
    return matched.map((node: MasterTreeNode): MasterFolderTreeSearchResult => ({ node }));
  }, [nodes, isActive, trimmed]);

  return { results, isActive };
}
