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
import type {
  AdminMenuCustomNode,
  AdminNavLeaf,
  AdminNavNodeEntry,
  FlattenedCustomNode,
} from '@/shared/contracts/admin';
import {
  NavItem,
  buildAdminMenuFromCustomNav,
  buildAdminNav,
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
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { internalError } from '@/shared/errors/app-error';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const flattenCustomNav = (
  items: AdminMenuCustomNode[],
  depth = 0,
  pathPrefix: number[] = []
): FlattenedCustomNode[] => {
  const entries: FlattenedCustomNode[] = [];
  items.forEach((node: AdminMenuCustomNode, index: number) => {
    const path = [...pathPrefix, index];
    entries.push({ node, path, depth, index, siblingCount: items.length });
    const children = node.children;
    if (children && children.length > 0) {
      entries.push(...flattenCustomNav(children, depth + 1, path));
    }
  });
  return entries;
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

const getNodeAtPath = (
  items: AdminMenuCustomNode[],
  path: number[]
): AdminMenuCustomNode | null => {
  let current: AdminMenuCustomNode | null = null;
  let cursor: AdminMenuCustomNode[] = items;
  for (const index of path) {
    current = cursor[index] ?? null;
    if (!current) return null;
    cursor = current.children ?? [];
  }
  return current;
};

const getParentAtPath = (
  items: AdminMenuCustomNode[],
  path: number[]
): { parent: AdminMenuCustomNode[]; index: number } | null => {
  if (path.length === 0) return null;
  const parentPath = path.slice(0, -1);
  const parentNode = parentPath.length ? getNodeAtPath(items, parentPath) : null;
  const parent = parentPath.length ? (parentNode?.children ?? null) : items;
  if (!parent) return null;
  return { parent, index: path[path.length - 1] as number };
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

// ── Context ──────────────────────────────────────────────────────────────────

export interface AdminMenuSettingsContextValue {
  // State
  favorites: string[];
  sectionColors: Record<string, string>;
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
  query: string;
  libraryQuery: string;
  draggedPath: number[] | null;
  dragOver: { path: number[]; position: 'above' | 'below' } | null;

  // Derived
  sections: Array<{ id: string; label: string }>;
  flattened: AdminNavLeaf[];
  favoritesSet: Set<string>;
  favoritesList: (AdminNavLeaf | undefined)[];
  filteredItems: AdminNavLeaf[];
  flattenedCustomNav: FlattenedCustomNode[];
  libraryItems: AdminNavNodeEntry[];
  libraryItemMap: Map<string, AdminNavNodeEntry>;
  customIds: Set<string>;
  filteredLibraryItems: AdminNavNodeEntry[];
  isDirty: boolean;
  isDefaultState: boolean;
  isSaving: boolean;

  // Actions
  setQuery: (q: string) => void;
  setLibraryQuery: (q: string) => void;
  setCustomEnabled: (enabled: boolean) => void;
  setDraggedPath: React.Dispatch<React.SetStateAction<number[] | null>>;
  setDragOver: React.Dispatch<
    React.SetStateAction<{ path: number[]; position: 'above' | 'below' } | null>
  >;
  handleToggleFavorite: (id: string, checked: boolean) => void;
  moveFavorite: (id: string, direction: 'up' | 'down') => void;
  updateSectionColor: (sectionId: string, value: string) => void;
  moveCustomNodeTo: (dragged: number[], target: number[], position: 'above' | 'below') => void;
  updateCustomLabel: (path: number[], value: string) => void;
  updateCustomHref: (path: number[], value: string) => void;
  handleAddRootNode: (kind: 'link' | 'group') => void;
  addCustomNodeAt: (kind: 'link' | 'group', parentPath?: number[]) => void;
  addBuiltInNode: (entry: AdminNavNodeEntry) => void;
  removeCustomNode: (path: number[]) => void;
  indentCustomNode: (path: number[]) => void;
  outdentCustomNode: (path: number[]) => void;
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
  const [draggedPath, setDraggedPath] = useState<number[] | null>(null);
  const [dragOver, setDragOver] = useState<{ path: number[]; position: 'above' | 'below' } | null>(
    null
  );

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

  const flattenedCustomNav = useMemo(() => flattenCustomNav(customNav), [customNav]);
  const libraryItems = useMemo(() => flattenAdminNavNodes(baseNav), [baseNav]);
  const libraryItemMap = useMemo(
    () => new Map(libraryItems.map((item: AdminNavNodeEntry) => [item.id, item])),
    [libraryItems]
  );
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

  const isSamePath = (a: number[], b: number[]): boolean =>
    a.length === b.length && a.every((value: number, index: number) => value === b[index]);
  const isPathPrefix = (parent: number[], child: number[]): boolean =>
    parent.length <= child.length &&
    parent.every((value: number, index: number) => value === child[index]);

  const moveCustomNodeTo = useCallback(
    (dragged: number[], target: number[], position: 'above' | 'below'): void => {
      if (isSamePath(dragged, target)) return;
      setCustomNav((prev: AdminMenuCustomNode[]) => {
        const next = cloneCustomNav(prev);
        const draggedInfo = getParentAtPath(next, dragged);
        const targetInfo = getParentAtPath(next, target);
        if (!draggedInfo || !targetInfo) return prev;
        const targetParentPath = target.slice(0, -1);
        if (isPathPrefix(dragged, targetParentPath)) return prev;
        const [node] = draggedInfo.parent.splice(draggedInfo.index, 1);
        if (!node) return prev;

        let insertIndex = position === 'above' ? targetInfo.index : targetInfo.index + 1;
        if (draggedInfo.parent === targetInfo.parent && draggedInfo.index < insertIndex) {
          insertIndex -= 1;
        }
        targetInfo.parent.splice(insertIndex, 0, node);
        return next;
      });
    },
    []
  );

  const updateCustomLabel = useCallback((path: number[], value: string): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const info = getParentAtPath(next, path);
      if (!info) return prev;
      const node = info.parent[info.index];
      if (!node) return prev;
      node.label = value;
      return next;
    });
  }, []);

  const updateCustomHref = useCallback((path: number[], value: string): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const info = getParentAtPath(next, path);
      if (!info) return prev;
      const node = info.parent[info.index];
      if (!node) return prev;
      if (value.trim().length === 0) {
        delete node.href;
      } else {
        node.href = value;
      }
      return next;
    });
  }, []);

  const addCustomNodeAt = useCallback((kind: 'link' | 'group', parentPath?: number[]): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const node = createCustomNode(kind);
      if (!parentPath || parentPath.length === 0) {
        next.unshift(node);
        return next;
      }
      const parentNode = getNodeAtPath(next, parentPath);
      if (!parentNode) return prev;
      if (!parentNode.children) parentNode.children = [];
      parentNode.children.push(node);
      return next;
    });
  }, []);

  const handleAddRootNode = useCallback(
    (kind: 'link' | 'group'): void => {
      setCustomEnabled(true);
      addCustomNodeAt(kind);
    },
    [addCustomNodeAt]
  );

  const addBuiltInNode = useCallback((entry: AdminNavNodeEntry): void => {
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

  const removeCustomNode = useCallback((path: number[]): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const info = getParentAtPath(next, path);
      if (!info) return prev;
      info.parent.splice(info.index, 1);
      return next;
    });
  }, []);

  const indentCustomNode = useCallback((path: number[]): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const info = getParentAtPath(next, path);
      if (!info || info.index === 0) return prev;
      const [node] = info.parent.splice(info.index, 1);
      const newParent = info.parent[info.index - 1];
      if (!newParent || !node) return prev;
      if (!newParent.children) newParent.children = [];
      newParent.children.push(node);
      return next;
    });
  }, []);

  const outdentCustomNode = useCallback((path: number[]): void => {
    if (path.length < 2) return;
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const info = getParentAtPath(next, path);
      if (!info) return prev;
      const parentPath = path.slice(0, -1);
      const parentInfo = getParentAtPath(next, parentPath);
      if (!parentInfo) return prev;
      const [node] = info.parent.splice(info.index, 1);
      if (!node) return prev;
      parentInfo.parent.splice(parentInfo.index + 1, 0, node);
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
      draggedPath,
      dragOver,
      sections,
      flattened,
      favoritesSet,
      favoritesList,
      filteredItems,
      flattenedCustomNav,
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
      setDraggedPath,
      setDragOver,
      handleToggleFavorite,
      moveFavorite,
      updateSectionColor,
      moveCustomNodeTo,
      updateCustomLabel,
      updateCustomHref,
      handleAddRootNode,
      addCustomNodeAt,
      addBuiltInNode,
      removeCustomNode,
      indentCustomNode,
      outdentCustomNode,
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
      draggedPath,
      dragOver,
      sections,
      flattened,
      favoritesSet,
      favoritesList,
      filteredItems,
      flattenedCustomNav,
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
      moveCustomNodeTo,
      updateCustomLabel,
      updateCustomHref,
      handleAddRootNode,
      addCustomNodeAt,
      addBuiltInNode,
      removeCustomNode,
      indentCustomNode,
      outdentCustomNode,
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
