'use client';

import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';

import {
  buildAdminMenuLayoutMasterNodes,
  readAdminMenuLayoutMetadata,
} from '@/features/admin/pages/admin-menu-layout-master-tree';
import type { AdminMenuLayoutNodeEntry as AdminMenuLayoutNodeState } from '@/features/admin/pages/admin-menu-layout-types';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
  parseAdminMenuBoolean,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import {
  adminNavToCustomNav,
  buildAdminMenuFromCustomNav,
  flattenAdminNav,
  getAdminMenuSections,
  normalizeAdminMenuCustomNav,
  type NavItem,
} from '@/features/admin/components/Menu';
import type {
  AdminMenuCustomNode,
  AdminNavLeaf,
  AdminNavNodeEntry,
} from '@/shared/contracts/admin';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  collectCustomIds,
  flattenAdminNavNodes,
  normalizeAdminMenuSearch,
} from './admin-menu-settings-tree';

type SettingsValues = {
  favorites: string[];
  sectionColors: Record<string, string>;
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
};

export function useAdminMenuSettingsDerivedState({
  baseNav,
  customEnabled,
  customNav,
  favorites,
  libraryQuery,
  query,
  sectionColors,
  settingsData,
  settingsFetched,
  setCustomEnabled,
  setCustomNav,
  setFavorites,
  setSectionColors,
}: {
  baseNav: NavItem[];
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
  favorites: string[];
  libraryQuery: string;
  query: string;
  sectionColors: Record<string, string>;
  settingsData: Map<string, string> | undefined;
  settingsFetched: boolean;
  setCustomEnabled: Dispatch<SetStateAction<boolean>>;
  setCustomNav: Dispatch<SetStateAction<AdminMenuCustomNode[]>>;
  setFavorites: Dispatch<SetStateAction<string[]>>;
  setSectionColors: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const defaultCustomNav = useMemo(() => adminNavToCustomNav(baseNav), [baseNav]);
  const normalizedCustomNav = useMemo(() => {
    const normalized = normalizeAdminMenuCustomNav(customNav);
    return normalized.length > 0 ? normalized : defaultCustomNav;
  }, [customNav, defaultCustomNav]);

  const settingsValues = useMemo((): SettingsValues => {
    const map = settingsData ?? new Map<string, string>();
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
  }, [settingsData]);

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
  const previousSettingsRef = useRef<string | null>(null);

  useEffect(() => {
    if (!settingsFetched) {
      return;
    }
    if (settingsSnapshot === previousSettingsRef.current) {
      return;
    }

    previousSettingsRef.current = settingsSnapshot;
    setFavorites(settingsValues.favorites);
    setSectionColors(settingsValues.sectionColors);
    setCustomEnabled(settingsValues.customEnabled);
    setCustomNav(settingsValues.customNav.length > 0 ? settingsValues.customNav : defaultCustomNav);
  }, [
    defaultCustomNav,
    setCustomEnabled,
    setCustomNav,
    setFavorites,
    setSectionColors,
    settingsFetched,
    settingsSnapshot,
    settingsValues,
  ]);

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
    const normalizedQuery = normalizeAdminMenuSearch(query);
    const items = flattened.filter((item: AdminNavLeaf) => {
      const keywords = item.keywords ?? [];
      const href = item.href ?? '';
      const searchable = [item.label, href, ...keywords, ...item.parents].join(' ');
      return normalizeAdminMenuSearch(searchable).includes(normalizedQuery);
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
    const normalizedQuery = normalizeAdminMenuSearch(libraryQuery);
    const items = libraryItems.filter((item: AdminNavNodeEntry) => {
      const href = item.href ?? '';
      const searchable = [item.label, href, ...item.parents].join(' ');
      return normalizeAdminMenuSearch(searchable).includes(normalizedQuery);
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

  return {
    defaultCustomNav,
    normalizedCustomNav,
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
  };
}
