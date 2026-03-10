'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  adminNavToCustomNav,
  buildAdminNav,
} from '@/features/admin/components/Menu';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
} from '@/features/admin/constants/admin-menu-settings';
import {
  buildAdminMenuLayoutMasterNodes,
  createAdminMenuLayoutFallbackMap,
  rebuildAdminMenuCustomNavFromMasterNodes,
  type AdminMenuLayoutNodeSemantic,
} from '@/features/admin/pages/admin-menu-layout-master-tree';
import type {
  AdminMenuCustomNode,
  AdminNavLeaf,
  AdminNavNodeEntry,
} from '@/shared/contracts/admin';
import { internalError } from '@/shared/errors/app-error';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

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
import { useAdminMenuSettingsDerivedState } from './useAdminMenuSettingsDerivedState';

import type {
  AdminMenuSettingsActionsContextValue,
  AdminMenuSettingsContextValue,
  AdminMenuSettingsStateContextValue,
} from './AdminMenuSettingsContext.types';

export type {
  AdminMenuLayoutNodeState,
  AdminMenuSettingsActionsContextValue,
  AdminMenuSettingsContextValue,
  AdminMenuSettingsStateContextValue,
} from './AdminMenuSettingsContext.types';

const AdminMenuSettingsStateContext = createContext<AdminMenuSettingsStateContextValue | null>(
  null
);
const AdminMenuSettingsActionsContext = createContext<AdminMenuSettingsActionsContextValue | null>(
  null
);

export function AdminMenuSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSettingsBulk = useUpdateSettingsBulk();

  const [favorites, setFavorites] = useState<string[]>([]);
  const [sectionColors, setSectionColors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [customEnabled, setCustomEnabled] = useState(false);
  const [customNav, setCustomNav] = useState<AdminMenuCustomNode[]>([]);
  const [libraryQuery, setLibraryQuery] = useState('');

  const noopClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
  }, []);

  const baseNav = useMemo(
    () =>
      buildAdminNav({
        onOpenChat: noopClick,
        onCreatePageClick: () => {},
      }),
    [noopClick]
  );

  const {
    customIds,
    defaultCustomNav,
    favoritesList,
    favoritesSet,
    filteredItems,
    filteredLibraryItems,
    flattened,
    isDefaultState,
    isDirty,
    layoutMasterNodes,
    layoutNodeStateById,
    libraryItemMap,
    libraryItems,
    normalizedCustomNav,
    sections,
  } = useAdminMenuSettingsDerivedState({
    baseNav,
    customEnabled,
    customNav,
    favorites,
    libraryQuery,
    query,
    sectionColors,
    settingsData: settingsQuery.data,
    settingsFetched: settingsQuery.isFetched,
    setCustomEnabled,
    setCustomNav,
    setFavorites,
    setSectionColors,
  });

  const handleToggleFavorite = useCallback((id: string, checked: boolean): void => {
    setFavorites((previous: string[]) => {
      if (checked) {
        if (previous.includes(id)) return previous;
        return [...previous, id];
      }
      return previous.filter((favoriteId: string) => favoriteId !== id);
    });
  }, []);

  const moveFavorite = useCallback((id: string, direction: 'up' | 'down'): void => {
    setFavorites((previous: string[]) => {
      const index = previous.indexOf(id);
      if (index === -1) return previous;
      const next = [...previous];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return previous;
      const [removed] = next.splice(index, 1);
      if (!removed) return previous;
      next.splice(targetIndex, 0, removed);
      return next;
    });
  }, []);

  const updateSectionColor = useCallback((sectionId: string, value: string): void => {
    setSectionColors((previous: Record<string, string>) => {
      const next = { ...previous };
      if (value === 'none') {
        delete next[sectionId];
        return next;
      }
      next[sectionId] = value;
      return next;
    });
  }, []);

  const handleAddRootNode = useCallback((kind: 'link' | 'group'): string => {
    const node = createCustomNode(kind);
    setCustomEnabled(true);
    setCustomNav((previous: AdminMenuCustomNode[]) => [node, ...previous]);
    return node.id;
  }, []);

  const addCustomChildNode = useCallback(
    (parentId: string, kind: 'link' | 'group'): string | null => {
      if (!parentId) return null;
      if (!findNodeById(customNav, parentId)) return null;
      const node = createCustomNode(kind);
      setCustomEnabled(true);
      setCustomNav((previous: AdminMenuCustomNode[]) => {
        const result = insertChildNodeById(previous, parentId, node);
        return result.inserted ? result.next : previous;
      });
      return node.id;
    },
    [customNav]
  );

  const removeCustomNodeById = useCallback((nodeId: string): void => {
    if (!nodeId) return;
    setCustomNav((previous: AdminMenuCustomNode[]) => {
      const result = removeNodeById(previous, nodeId);
      return result.removed ? result.next : previous;
    });
  }, []);

  const updateCustomNodeLabelById = useCallback(
    (nodeId: string, value: string): void => {
      if (!nodeId || libraryItemMap.has(nodeId)) return;
      setCustomNav((previous: AdminMenuCustomNode[]) => {
        const result = updateNodeById(previous, nodeId, (node) => ({
          ...node,
          label: value,
        }));
        return result.updated ? result.next : previous;
      });
    },
    [libraryItemMap]
  );

  const updateCustomNodeHrefById = useCallback(
    (nodeId: string, value: string): void => {
      if (!nodeId || libraryItemMap.has(nodeId)) return;
      const nextHref = value.trim();
      setCustomNav((previous: AdminMenuCustomNode[]) => {
        const result = updateNodeById(previous, nodeId, (node) => {
          if (nextHref.length === 0) {
            const { href: _href, ...rest } = node;
            return rest;
          }
          return {
            ...node,
            href: nextHref,
          };
        });
        return result.updated ? result.next : previous;
      });
    },
    [libraryItemMap]
  );

  const updateCustomNodeSemanticById = useCallback(
    (nodeId: string, semantic: AdminMenuLayoutNodeSemantic): void => {
      if (!nodeId || libraryItemMap.has(nodeId)) return;
      setCustomNav((previous: AdminMenuCustomNode[]) => {
        const target = findNodeById(previous, nodeId);
        if (!target) return previous;
        const base = libraryItemMap.get(nodeId);
        const result = updateNodeById(previous, nodeId, (node) => {
          if (semantic === 'group') {
            const { href: _href, ...rest } = node;
            return rest;
          }

          const hrefCandidate =
            node.href?.trim() || base?.href?.trim() || target.href?.trim() || '/admin';

          return {
            ...node,
            href: hrefCandidate,
          };
        });

        return result.updated ? result.next : previous;
      });
    },
    [libraryItemMap]
  );

  const replaceCustomNavFromMasterNodes = useCallback(
    (nextNodes: MasterTreeNode[]): void => {
      setCustomEnabled(true);
      setCustomNav((previous: AdminMenuCustomNode[]) => {
        const fallbackNodes = buildAdminMenuLayoutMasterNodes(previous, libraryItemMap);
        const fallbackById = createAdminMenuLayoutFallbackMap(fallbackNodes);
        return rebuildAdminMenuCustomNavFromMasterNodes(nextNodes, fallbackById);
      });
    },
    [libraryItemMap]
  );

  const addBuiltInNode = useCallback((entry: AdminNavNodeEntry): void => {
    setCustomEnabled(true);
    setCustomNav((previous: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(previous);
      const usedIds = collectCustomIds(next);
      const [node] = adminNavToCustomNav([entry.item]);
      if (!node) return previous;
      const cleaned = stripUsedIds(node, usedIds);
      if (!cleaned) return previous;
      next.push(cleaned);
      return next;
    });
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    try {
      const validFavorites = favorites.filter((id: string) =>
        flattened.some((item: AdminNavLeaf) => item.id === id)
      );
      const sectionIds = new Set(sections.map((section: { id: string }) => section.id));
      const validSectionColors = Object.fromEntries(
        Object.entries(sectionColors).filter(([sectionId]: [string, string]) =>
          sectionIds.has(sectionId)
        )
      );
      await updateSettingsBulk.mutateAsync([
        { key: ADMIN_MENU_FAVORITES_KEY, value: JSON.stringify(validFavorites) },
        { key: ADMIN_MENU_SECTION_COLORS_KEY, value: JSON.stringify(validSectionColors) },
        { key: ADMIN_MENU_CUSTOM_ENABLED_KEY, value: JSON.stringify(customEnabled) },
        { key: ADMIN_MENU_CUSTOM_NAV_KEY, value: JSON.stringify(normalizedCustomNav) },
      ]);
      toast('Admin menu settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminMenuSettingsPage', action: 'save' } });
      toast(error instanceof Error ? error.message : 'Failed to save admin menu settings.', {
        variant: 'error',
      });
    }
  }, [
    customEnabled,
    favorites,
    flattened,
    normalizedCustomNav,
    sectionColors,
    sections,
    toast,
    updateSettingsBulk,
  ]);

  const handleReset = useCallback((): void => {
    setFavorites([]);
    setSectionColors({});
    setCustomEnabled(false);
    setCustomNav(defaultCustomNav);
  }, [defaultCustomNav]);

  const stateValue = useMemo(
    (): AdminMenuSettingsStateContextValue => ({
      favorites,
      sectionColors,
      customEnabled,
      customNav,
      query,
      libraryQuery,
      sections,
      flattened,
      favoritesSet,
      favoritesList,
      filteredItems,
      layoutMasterNodes,
      layoutNodeStateById,
      libraryItems,
      libraryItemMap,
      customIds,
      filteredLibraryItems,
      isDirty,
      isDefaultState,
      isSaving: updateSettingsBulk.isPending,
    }),
    [
      customEnabled,
      customIds,
      customNav,
      favorites,
      favoritesList,
      favoritesSet,
      filteredItems,
      filteredLibraryItems,
      flattened,
      isDefaultState,
      isDirty,
      layoutMasterNodes,
      layoutNodeStateById,
      libraryItemMap,
      libraryItems,
      libraryQuery,
      query,
      sectionColors,
      sections,
      updateSettingsBulk.isPending,
    ]
  );

  const actionsValue = useMemo(
    (): AdminMenuSettingsActionsContextValue => ({
      setQuery,
      setLibraryQuery,
      setCustomEnabled,
      handleToggleFavorite,
      moveFavorite,
      updateSectionColor,
      handleAddRootNode,
      addCustomChildNode,
      removeCustomNodeById,
      updateCustomNodeLabelById,
      updateCustomNodeHrefById,
      updateCustomNodeSemanticById,
      replaceCustomNavFromMasterNodes,
      addBuiltInNode,
      handleSave,
      handleReset,
    }),
    [
      addBuiltInNode,
      addCustomChildNode,
      handleAddRootNode,
      handleReset,
      handleSave,
      handleToggleFavorite,
      moveFavorite,
      removeCustomNodeById,
      replaceCustomNavFromMasterNodes,
      updateCustomNodeHrefById,
      updateCustomNodeLabelById,
      updateCustomNodeSemanticById,
      updateSectionColor,
    ]
  );

  return (
    <AdminMenuSettingsActionsContext.Provider value={actionsValue}>
      <AdminMenuSettingsStateContext.Provider value={stateValue}>
        {children}
      </AdminMenuSettingsStateContext.Provider>
    </AdminMenuSettingsActionsContext.Provider>
  );
}

export function useAdminMenuSettingsState(): AdminMenuSettingsStateContextValue {
  const context = useContext(AdminMenuSettingsStateContext);
  if (!context) {
    throw internalError('useAdminMenuSettingsState must be used within AdminMenuSettingsProvider');
  }
  return context;
}

export function useAdminMenuSettingsActions(): AdminMenuSettingsActionsContextValue {
  const context = useContext(AdminMenuSettingsActionsContext);
  if (!context) {
    throw internalError(
      'useAdminMenuSettingsActions must be used within AdminMenuSettingsProvider'
    );
  }
  return context;
}

export function useAdminMenuSettings(): AdminMenuSettingsContextValue {
  const state = useAdminMenuSettingsState();
  const actions = useAdminMenuSettingsActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
