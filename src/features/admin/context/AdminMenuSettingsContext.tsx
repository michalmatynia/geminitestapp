'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  buildAdminMenuLayoutMasterNodes,
  rebuildAdminMenuCustomNavFromMasterNodes,
  createAdminMenuLayoutFallbackMap,
  readAdminMenuLayoutMetadata,
  type AdminMenuLayoutNodeSemantic,
} from '@/features/admin/pages/admin-menu-layout-master-tree';
import {
  buildAdminMenuFromCustomNav,
  buildAdminNav,
  type NavItem,
  adminNavToCustomNav,
  flattenAdminNav,
  getAdminMenuSections,
  normalizeAdminMenuCustomNav,
} from '@/features/admin/components/Menu';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
  parseAdminMenuBoolean,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import type {
  AdminMenuCustomNode,
  AdminNavLeaf,
  AdminNavNodeEntry,
} from '@/shared/contracts/admin';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { internalError } from '@/shared/errors/app-error';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const createCustomId = (): string =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createCustomNode = (kind: 'link' | 'group'): AdminMenuCustomNode => ({
  id: createCustomId(),
  label: kind === 'group' ? 'New Group' : 'New Link',
  ...(kind === 'link' ? { href: '/admin' } : {}),
  ...(kind === 'group' ? { children: [] } : {}),
});

const cloneCustomNav = (items: AdminMenuCustomNode[]): AdminMenuCustomNode[] => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(items);
  }
  return JSON.parse(JSON.stringify(items)) as AdminMenuCustomNode[];
};

const flattenAdminNavNodes = (items: NavItem[], parents: string[] = []): AdminNavNodeEntry[] => {
  const entries: AdminNavNodeEntry[] = [];
  items.forEach((item: NavItem) => {
    entries.push({
      id: item.id,
      label: item.label,
      parents,
      item,
      ...(item.href ? { href: item.href } : {}),
    });
    const children = item.children;
    if (children && children.length > 0) {
      entries.push(...flattenAdminNavNodes(children, [...parents, item.label]));
    }
  });
  return entries;
};

const collectCustomIds = (
  items: AdminMenuCustomNode[],
  ids: Set<string> = new Set<string>()
): Set<string> => {
  items.forEach((node: AdminMenuCustomNode) => {
    ids.add(node.id);
    const children = node.children;
    if (children && children.length > 0) {
      collectCustomIds(children, ids);
    }
  });
  return ids;
};

const stripUsedIds = (
  node: AdminMenuCustomNode,
  usedIds: Set<string>
): AdminMenuCustomNode | null => {
  if (usedIds.has(node.id)) return null;
  usedIds.add(node.id);
  const nodeChildren = node.children;
  const children = nodeChildren
    ? nodeChildren
      .map((child: AdminMenuCustomNode) => stripUsedIds(child, usedIds))
      .filter((child: AdminMenuCustomNode | null): child is AdminMenuCustomNode => Boolean(child))
    : undefined;
  return {
    ...node,
    ...(children ? { children } : {}),
  };
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const updateNodeById = (
  items: AdminMenuCustomNode[],
  nodeId: string,
  updater: (node: AdminMenuCustomNode) => AdminMenuCustomNode
): { next: AdminMenuCustomNode[]; updated: boolean } => {
  const walk = (
    nodes: AdminMenuCustomNode[]
  ): { next: AdminMenuCustomNode[]; updated: boolean } => {
    let updated = false;
    const nextNodes = nodes.map((node: AdminMenuCustomNode) => {
      if (node.id === nodeId) {
        updated = true;
        return updater(node);
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        const childResult = walk(node.children);
        if (childResult.updated) {
          updated = true;
          return {
            ...node,
            children: childResult.next,
          };
        }
      }
      return node;
    });

    return { next: updated ? nextNodes : nodes, updated };
  };

  return walk(items);
};

const insertChildNodeById = (
  items: AdminMenuCustomNode[],
  parentId: string,
  nodeToInsert: AdminMenuCustomNode
): { next: AdminMenuCustomNode[]; inserted: boolean } => {
  const walk = (
    nodes: AdminMenuCustomNode[]
  ): { next: AdminMenuCustomNode[]; inserted: boolean } => {
    let inserted = false;
    const nextNodes = nodes.map((node: AdminMenuCustomNode) => {
      if (node.id === parentId) {
        inserted = true;
        return {
          ...node,
          children: [...(node.children ?? []), nodeToInsert],
        };
      }

      if (Array.isArray(node.children) && node.children.length > 0) {
        const childResult = walk(node.children);
        if (childResult.inserted) {
          inserted = true;
          return {
            ...node,
            children: childResult.next,
          };
        }
      }

      return node;
    });

    return { next: inserted ? nextNodes : nodes, inserted };
  };

  return walk(items);
};

const removeNodeById = (
  items: AdminMenuCustomNode[],
  nodeId: string
): { next: AdminMenuCustomNode[]; removed: boolean } => {
  const walk = (
    nodes: AdminMenuCustomNode[]
  ): { next: AdminMenuCustomNode[]; removed: boolean } => {
    let removed = false;
    const nextNodes: AdminMenuCustomNode[] = [];

    nodes.forEach((node: AdminMenuCustomNode) => {
      if (node.id === nodeId) {
        removed = true;
        return;
      }

      if (Array.isArray(node.children) && node.children.length > 0) {
        const childResult = walk(node.children);
        if (childResult.removed) {
          removed = true;
          nextNodes.push({
            ...node,
            ...(childResult.next.length > 0 ? { children: childResult.next } : {}),
          });
          return;
        }
      }

      nextNodes.push(node);
    });

    return { next: removed ? nextNodes : nodes, removed };
  };

  return walk(items);
};

const findNodeById = (items: AdminMenuCustomNode[], nodeId: string): AdminMenuCustomNode | null => {
  for (const node of items) {
    if (node.id === nodeId) return node;
    if (Array.isArray(node.children) && node.children.length > 0) {
      const nested = findNodeById(node.children, nodeId);
      if (nested) return nested;
    }
  }
  return null;
};

export type AdminMenuLayoutNodeState = {
  id: string;
  label: string;
  semantic: AdminMenuLayoutNodeSemantic;
  href: string | null;
  isBuiltIn: boolean;
};

export interface AdminMenuSettingsContextValue {
  favorites: string[];
  sectionColors: Record<string, string>;
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
  query: string;
  libraryQuery: string;

  sections: Array<{ id: string; label: string }>;
  flattened: AdminNavLeaf[];
  favoritesSet: Set<string>;
  favoritesList: (AdminNavLeaf | undefined)[];
  filteredItems: AdminNavLeaf[];
  layoutMasterNodes: MasterTreeNode[];
  layoutNodeStateById: Map<string, AdminMenuLayoutNodeState>;
  libraryItems: AdminNavNodeEntry[];
  libraryItemMap: Map<string, AdminNavNodeEntry>;
  customIds: Set<string>;
  filteredLibraryItems: AdminNavNodeEntry[];
  isDirty: boolean;
  isDefaultState: boolean;
  isSaving: boolean;

  setQuery: (q: string) => void;
  setLibraryQuery: (q: string) => void;
  setCustomEnabled: (enabled: boolean) => void;
  handleToggleFavorite: (id: string, checked: boolean) => void;
  moveFavorite: (id: string, direction: 'up' | 'down') => void;
  updateSectionColor: (sectionId: string, value: string) => void;
  handleAddRootNode: (kind: 'link' | 'group') => string;
  addCustomChildNode: (parentId: string, kind: 'link' | 'group') => string | null;
  removeCustomNodeById: (nodeId: string) => void;
  updateCustomNodeLabelById: (nodeId: string, value: string) => void;
  updateCustomNodeHrefById: (nodeId: string, value: string) => void;
  updateCustomNodeSemanticById: (nodeId: string, semantic: AdminMenuLayoutNodeSemantic) => void;
  replaceCustomNavFromMasterNodes: (nextNodes: MasterTreeNode[]) => void;
  addBuiltInNode: (entry: AdminNavNodeEntry) => void;
  handleSave: () => Promise<void>;
  handleReset: () => void;
}

const AdminMenuSettingsContext = createContext<AdminMenuSettingsContextValue | null>(null);

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

  const defaultCustomNav = useMemo(() => adminNavToCustomNav(baseNav), [baseNav]);
  const normalizedCustomNav = useMemo(() => {
    const normalized = normalizeAdminMenuCustomNav(customNav);
    return normalized.length > 0 ? normalized : defaultCustomNav;
  }, [customNav, defaultCustomNav]);

  interface SettingsValues {
    favorites: string[];
    sectionColors: Record<string, string>;
    customEnabled: boolean;
    customNav: AdminMenuCustomNode[];
  }

  const settingsValues = useMemo((): SettingsValues => {
    const map = settingsQuery.data ?? new Map<string, string>();
    const favoritesRaw = parseAdminMenuJson<unknown[]>(map.get(ADMIN_MENU_FAVORITES_KEY), []);
    const sectionColorsRaw = parseAdminMenuJson<Record<string, string> | null>(
      map.get(ADMIN_MENU_SECTION_COLORS_KEY),
      null
    );
    const customEnabledValue = parseAdminMenuBoolean(map.get(ADMIN_MENU_CUSTOM_ENABLED_KEY), false);
    const customNavRaw = parseAdminMenuJson<AdminMenuCustomNode[]>(
      map.get(ADMIN_MENU_CUSTOM_NAV_KEY),
      []
    );
    return {
      favorites: favoritesRaw.filter(
        (id: unknown): id is string => typeof id === 'string' && id.length > 0
      ),
      sectionColors:
        sectionColorsRaw && typeof sectionColorsRaw === 'object' ? sectionColorsRaw : {},
      customEnabled: customEnabledValue,
      customNav: normalizeAdminMenuCustomNav(customNavRaw),
    };
  }, [settingsQuery.data]);

  const settingsSnapshot = useMemo(
    () =>
      JSON.stringify({
        favorites: settingsValues.favorites,
        sectionColors: settingsValues.sectionColors,
        customEnabled: settingsValues.customEnabled,
        customNav:
          settingsValues.customNav.length > 0 ? settingsValues.customNav : defaultCustomNav,
      }),
    [defaultCustomNav, settingsValues]
  );

  const prevSettingsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!settingsQuery.isFetched) return;
    if (settingsSnapshot === prevSettingsRef.current) return;
    prevSettingsRef.current = settingsSnapshot;
    setFavorites(settingsValues.favorites);
    setSectionColors(settingsValues.sectionColors);
    setCustomEnabled(settingsValues.customEnabled);
    setCustomNav(settingsValues.customNav.length > 0 ? settingsValues.customNav : defaultCustomNav);
  }, [defaultCustomNav, settingsQuery.isFetched, settingsSnapshot, settingsValues]);

  const menuNav = useMemo(
    () => (customEnabled ? buildAdminMenuFromCustomNav(normalizedCustomNav, baseNav) : baseNav),
    [baseNav, customEnabled, normalizedCustomNav]
  );

  const sections = useMemo(() => getAdminMenuSections(menuNav), [menuNav]);
  const flattened = useMemo(() => flattenAdminNav(menuNav), [menuNav]);
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const favoritesList = useMemo(
    () =>
      favorites
        .map((id: string) => flattened.find((item: AdminNavLeaf) => item.id === id))
        .filter((item: AdminNavLeaf | undefined): item is AdminNavLeaf => item !== undefined),
    [favorites, flattened]
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(query);
    const items = flattened.filter((item: AdminNavLeaf) => {
      const keywords = item.keywords ?? [];
      const href = item.href ?? '';
      const searchable = [item.label, href, ...keywords, ...item.parents].join(' ');
      return normalize(searchable).includes(normalizedQuery);
    });
    return items.sort((a: AdminNavLeaf, b: AdminNavLeaf) => a.label.localeCompare(b.label));
  }, [flattened, query]);

  const libraryItems = useMemo(() => flattenAdminNavNodes(baseNav), [baseNav]);
  const libraryItemMap = useMemo(
    () => new Map(libraryItems.map((item: AdminNavNodeEntry) => [item.id, item])),
    [libraryItems]
  );

  const layoutMasterNodes = useMemo(
    () => buildAdminMenuLayoutMasterNodes(customNav, libraryItemMap),
    [customNav, libraryItemMap]
  );

  const layoutNodeStateById = useMemo(() => {
    const map = new Map<string, AdminMenuLayoutNodeState>();

    layoutMasterNodes.forEach((node: MasterTreeNode) => {
      const metadata = readAdminMenuLayoutMetadata(node);
      const base = libraryItemMap.get(node.id);
      const href = metadata?.href ?? (typeof base?.href === 'string' ? base.href : null);

      map.set(node.id, {
        id: node.id,
        label: node.name,
        semantic: metadata?.semantic ?? (href ? 'link' : 'group'),
        href,
        isBuiltIn: metadata?.isBuiltIn ?? libraryItemMap.has(node.id),
      });
    });

    return map;
  }, [layoutMasterNodes, libraryItemMap]);

  const customIds = useMemo(() => collectCustomIds(customNav), [customNav]);

  const filteredLibraryItems = useMemo(() => {
    const normalizedQuery = normalize(libraryQuery);
    const items = libraryItems.filter((item: AdminNavNodeEntry) => {
      const href = item.href ?? '';
      const searchable = [item.label, href, ...item.parents].join(' ');
      return normalize(searchable).includes(normalizedQuery);
    });
    return items.sort((a: AdminNavNodeEntry, b: AdminNavNodeEntry) =>
      a.label.localeCompare(b.label)
    );
  }, [libraryItems, libraryQuery]);

  const defaultPayload = useMemo(
    () =>
      JSON.stringify({
        favorites: [],
        sectionColors: {},
        customEnabled: false,
        customNav: defaultCustomNav,
      }),
    [defaultCustomNav]
  );

  const baseline = useMemo(
    () =>
      JSON.stringify({
        favorites: settingsValues.favorites,
        sectionColors: settingsValues.sectionColors,
        customEnabled: settingsValues.customEnabled,
        customNav:
          settingsValues.customNav.length > 0 ? settingsValues.customNav : defaultCustomNav,
      }),
    [defaultCustomNav, settingsValues]
  );

  const currentPayload = useMemo(
    () =>
      JSON.stringify({
        favorites,
        sectionColors,
        customEnabled,
        customNav: normalizedCustomNav,
      }),
    [customEnabled, favorites, normalizedCustomNav, sectionColors]
  );

  const isDirty = baseline !== currentPayload;
  const isDefaultState = currentPayload === defaultPayload;

  const handleToggleFavorite = useCallback((id: string, checked: boolean): void => {
    setFavorites((prev: string[]) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((fav: string) => fav !== id);
    });
  }, []);

  const moveFavorite = useCallback((id: string, direction: 'up' | 'down'): void => {
    setFavorites((prev: string[]) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const [removed] = next.splice(index, 1);
      if (!removed) return prev;
      next.splice(targetIndex, 0, removed);
      return next;
    });
  }, []);

  const updateSectionColor = useCallback((sectionId: string, value: string): void => {
    setSectionColors((prev: Record<string, string>) => {
      const next = { ...prev };
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
    setCustomNav((prev: AdminMenuCustomNode[]) => [node, ...prev]);
    return node.id;
  }, []);

  const addCustomChildNode = useCallback(
    (parentId: string, kind: 'link' | 'group'): string | null => {
      if (!parentId) return null;
      if (!findNodeById(customNav, parentId)) return null;
      const node = createCustomNode(kind);
      setCustomEnabled(true);
      setCustomNav((prev: AdminMenuCustomNode[]) => {
        const result = insertChildNodeById(prev, parentId, node);
        return result.inserted ? result.next : prev;
      });

      return node.id;
    },
    [customNav]
  );

  const removeCustomNodeById = useCallback((nodeId: string): void => {
    if (!nodeId) return;
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const result = removeNodeById(prev, nodeId);
      return result.removed ? result.next : prev;
    });
  }, []);

  const updateCustomNodeLabelById = useCallback(
    (nodeId: string, value: string): void => {
      if (!nodeId || libraryItemMap.has(nodeId)) return;
      setCustomNav((prev: AdminMenuCustomNode[]) => {
        const result = updateNodeById(prev, nodeId, (node) => ({
          ...node,
          label: value,
        }));
        return result.updated ? result.next : prev;
      });
    },
    [libraryItemMap]
  );

  const updateCustomNodeHrefById = useCallback(
    (nodeId: string, value: string): void => {
      if (!nodeId || libraryItemMap.has(nodeId)) return;
      const nextHref = value.trim();

      setCustomNav((prev: AdminMenuCustomNode[]) => {
        const result = updateNodeById(prev, nodeId, (node) => {
          if (nextHref.length === 0) {
            const { href: _href, ...rest } = node;
            return rest;
          }
          return {
            ...node,
            href: nextHref,
          };
        });
        return result.updated ? result.next : prev;
      });
    },
    [libraryItemMap]
  );

  const updateCustomNodeSemanticById = useCallback(
    (nodeId: string, semantic: AdminMenuLayoutNodeSemantic): void => {
      if (!nodeId || libraryItemMap.has(nodeId)) return;

      setCustomNav((prev: AdminMenuCustomNode[]) => {
        const target = findNodeById(prev, nodeId);
        if (!target) return prev;
        const base = libraryItemMap.get(nodeId);

        const result = updateNodeById(prev, nodeId, (node) => {
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

        return result.updated ? result.next : prev;
      });
    },
    [libraryItemMap]
  );

  const replaceCustomNavFromMasterNodes = useCallback(
    (nextNodes: MasterTreeNode[]): void => {
      setCustomEnabled(true);
      setCustomNav((prev: AdminMenuCustomNode[]) => {
        const fallbackNodes = buildAdminMenuLayoutMasterNodes(prev, libraryItemMap);
        const fallbackById = createAdminMenuLayoutFallbackMap(fallbackNodes);
        return rebuildAdminMenuCustomNavFromMasterNodes(nextNodes, fallbackById);
      });
    },
    [libraryItemMap]
  );

  const addBuiltInNode = useCallback((entry: AdminNavNodeEntry): void => {
    setCustomEnabled(true);
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const usedIds = collectCustomIds(next);
      const [node] = adminNavToCustomNav([entry.item]);
      if (!node) return prev;
      const cleaned = stripUsedIds(node, usedIds);
      if (!cleaned) return prev;
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

  const value = useMemo(
    () => ({
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
      updateSettingsBulk.isPending,
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
    ]
  );

  return (
    <AdminMenuSettingsContext.Provider value={value}>{children}</AdminMenuSettingsContext.Provider>
  );
}

export function useAdminMenuSettings(): AdminMenuSettingsContextValue {
  const context = useContext(AdminMenuSettingsContext);
  if (!context) {
    throw internalError('useAdminMenuSettings must be used within AdminMenuSettingsProvider');
  }
  return context;
}
