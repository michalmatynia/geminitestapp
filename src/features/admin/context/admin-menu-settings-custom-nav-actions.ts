'use client';

import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';

import { adminNavToCustomNav } from '@/features/admin/components/menu/admin-menu-utils';
import {
  buildAdminMenuLayoutMasterNodes,
  createAdminMenuLayoutFallbackMap,
  rebuildAdminMenuCustomNavFromMasterNodes,
  type AdminMenuLayoutNodeSemantic,
} from '@/features/admin/pages/admin-menu-layout-master-tree';
import type { AdminMenuCustomNode, AdminNavNodeEntry } from '@/shared/contracts/admin';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { AdminMenuSettingsActionsContextValue } from './AdminMenuSettingsContext.types';
import {
  cloneCustomNav,
  collectCustomIds,
  createCustomNode,
  findNodeById,
  insertChildNodeById,
  removeNodeById,
  stripUsedIds,
  updateNodeById,
} from './admin-menu-settings-tree';

type CustomNavMutationArgs = {
  customNav: AdminMenuCustomNode[];
  libraryItemMap: Map<string, AdminNavNodeEntry>;
  setCustomEnabled: Dispatch<SetStateAction<boolean>>;
  setCustomNav: Dispatch<SetStateAction<AdminMenuCustomNode[]>>;
};

const hasNonEmptyText = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== '';

const stripHrefFromNode = (node: AdminMenuCustomNode): AdminMenuCustomNode => {
  const next = { ...node };
  delete next.href;
  return next;
};

const resolveHrefCandidate = (candidates: Array<string | null | undefined>): string => {
  for (const candidate of candidates) {
    if (!hasNonEmptyText(candidate)) {
      continue;
    }
    const trimmed = candidate.trim();
    if (trimmed !== '') {
      return trimmed;
    }
  }
  return '/admin';
};

function useCustomNavStructureActions({
  customNav,
  setCustomEnabled,
  setCustomNav,
}: Pick<CustomNavMutationArgs, 'customNav' | 'setCustomEnabled' | 'setCustomNav'>): Pick<
  AdminMenuSettingsActionsContextValue,
  'addCustomChildNode' | 'handleAddRootNode' | 'removeCustomNodeById'
> {
  const handleAddRootNode = useCallback((kind: 'link' | 'group'): string => {
    const node = createCustomNode(kind);
    setCustomEnabled(true);
    setCustomNav((previous: AdminMenuCustomNode[]) => [node, ...previous]);
    return node.id;
  }, [setCustomEnabled, setCustomNav]);

  const addCustomChildNode = useCallback((parentId: string, kind: 'link' | 'group'): string | null => {
    if (parentId === '' || findNodeById(customNav, parentId) === null) return null;
    const node = createCustomNode(kind);
    setCustomEnabled(true);
    setCustomNav((previous: AdminMenuCustomNode[]) => {
      const result = insertChildNodeById(previous, parentId, node);
      return result.inserted ? result.next : previous;
    });
    return node.id;
  }, [customNav, setCustomEnabled, setCustomNav]);

  const removeCustomNodeById = useCallback((nodeId: string): void => {
    if (nodeId === '') return;
    setCustomNav((previous: AdminMenuCustomNode[]) => {
      const result = removeNodeById(previous, nodeId);
      return result.removed ? result.next : previous;
    });
  }, [setCustomNav]);

  return { addCustomChildNode, handleAddRootNode, removeCustomNodeById };
}

function useCustomNavEditingActions({
  libraryItemMap,
  setCustomNav,
}: Pick<CustomNavMutationArgs, 'libraryItemMap' | 'setCustomNav'>): Pick<
  AdminMenuSettingsActionsContextValue,
  'updateCustomNodeHrefById' | 'updateCustomNodeLabelById' | 'updateCustomNodeSemanticById'
> {
  const updateCustomNodeLabelById = useCallback((nodeId: string, value: string): void => {
    if (nodeId === '' || libraryItemMap.has(nodeId)) return;
    setCustomNav((previous: AdminMenuCustomNode[]) => {
      const result = updateNodeById(previous, nodeId, (node) => ({ ...node, label: value }));
      return result.updated ? result.next : previous;
    });
  }, [libraryItemMap, setCustomNav]);

  const updateCustomNodeHrefById = useCallback((nodeId: string, value: string): void => {
    if (nodeId === '' || libraryItemMap.has(nodeId)) return;
    const nextHref = value.trim();
    setCustomNav((previous: AdminMenuCustomNode[]) => {
      const result = updateNodeById(previous, nodeId, (node) =>
        nextHref.length === 0 ? stripHrefFromNode(node) : { ...node, href: nextHref }
      );
      return result.updated ? result.next : previous;
    });
  }, [libraryItemMap, setCustomNav]);

  const updateCustomNodeSemanticById = useCallback((nodeId: string, semantic: AdminMenuLayoutNodeSemantic): void => {
    if (nodeId === '' || libraryItemMap.has(nodeId)) return;
    setCustomNav((previous: AdminMenuCustomNode[]) => {
      const target = findNodeById(previous, nodeId);
      if (target === null) return previous;
      const base = libraryItemMap.get(nodeId);
      const result = updateNodeById(previous, nodeId, (node) =>
        semantic === 'group'
          ? stripHrefFromNode(node)
          : { ...node, href: resolveHrefCandidate([node.href, base?.href, target.href]) }
      );
      return result.updated ? result.next : previous;
    });
  }, [libraryItemMap, setCustomNav]);

  return {
    updateCustomNodeHrefById,
    updateCustomNodeLabelById,
    updateCustomNodeSemanticById,
  };
}

function useCustomNavLayoutActions({
  libraryItemMap,
  setCustomEnabled,
  setCustomNav,
}: Pick<CustomNavMutationArgs, 'libraryItemMap' | 'setCustomEnabled' | 'setCustomNav'>): Pick<
  AdminMenuSettingsActionsContextValue,
  'addBuiltInNode' | 'replaceCustomNavFromMasterNodes'
> {
  const replaceCustomNavFromMasterNodes = useCallback((nextNodes: MasterTreeNode[]): void => {
    setCustomEnabled(true);
    setCustomNav((previous: AdminMenuCustomNode[]) => {
      const fallbackNodes = buildAdminMenuLayoutMasterNodes(previous, libraryItemMap);
      const fallbackById = createAdminMenuLayoutFallbackMap(fallbackNodes);
      return rebuildAdminMenuCustomNavFromMasterNodes(nextNodes, fallbackById);
    });
  }, [libraryItemMap, setCustomEnabled, setCustomNav]);

  const addBuiltInNode = useCallback((entry: AdminNavNodeEntry): void => {
    setCustomEnabled(true);
    setCustomNav((previous: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(previous);
      const usedIds = collectCustomIds(next);
      const [node] = adminNavToCustomNav([entry.item]);
      if (node === undefined) return previous;
      const cleaned = stripUsedIds(node, usedIds);
      if (cleaned === null) return previous;
      next.push(cleaned);
      return next;
    });
  }, [setCustomEnabled, setCustomNav]);

  return { addBuiltInNode, replaceCustomNavFromMasterNodes };
}

export function useCustomNavMutationActions(
  args: CustomNavMutationArgs
): Pick<
  AdminMenuSettingsActionsContextValue,
  | 'addBuiltInNode'
  | 'addCustomChildNode'
  | 'handleAddRootNode'
  | 'removeCustomNodeById'
  | 'replaceCustomNavFromMasterNodes'
  | 'updateCustomNodeHrefById'
  | 'updateCustomNodeLabelById'
  | 'updateCustomNodeSemanticById'
> {
  const structureActions = useCustomNavStructureActions(args);
  const editingActions = useCustomNavEditingActions(args);
  const layoutActions = useCustomNavLayoutActions(args);

  return useMemo(
    () => ({ ...structureActions, ...editingActions, ...layoutActions }),
    [editingActions, layoutActions, structureActions]
  );
}
