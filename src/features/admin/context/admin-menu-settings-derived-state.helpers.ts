'use client';

import { useMemo } from 'react';

import {
  adminNavToCustomNav,
  buildAdminMenuFromCustomNav,
  flattenAdminNav,
  getAdminMenuSections,
  normalizeAdminMenuCustomNav,
  type NavItem,
} from '@/features/admin/components/menu/admin-menu-utils';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
  parseAdminMenuBoolean,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import {
  buildAdminMenuLayoutMasterNodes,
  readAdminMenuLayoutMetadata,
} from '@/features/admin/pages/admin-menu-layout-master-tree';
import type { AdminMenuLayoutNodeEntry as AdminMenuLayoutNodeState } from '@/features/admin/pages/admin-menu-layout-types';
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

export type SettingsValues = {
  favorites: string[];
  sectionColors: Record<string, string>;
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
};

export type UseAdminMenuSettingsDerivedStateArgs = {
  baseNav: NavItem[];
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
  favorites: string[];
  libraryQuery: string;
  query: string;
  sectionColors: Record<string, string>;
  settingsData: Map<string, string> | undefined;
};

export type UseAdminMenuSettingsPayloadState = {
  baseline: string;
  currentPayload: string;
  defaultCustomNav: AdminMenuCustomNode[];
  defaultPayload: string;
  isDefaultState: boolean;
  isDirty: boolean;
  normalizedCustomNav: AdminMenuCustomNode[];
  settingsSnapshot: string;
  settingsValues: SettingsValues;
};

export type UseAdminMenuSettingsCollectionsState = {
  customIds: Set<string>;
  favoritesList: AdminNavLeaf[];
  favoritesSet: Set<string>;
  filteredItems: AdminNavLeaf[];
  filteredLibraryItems: AdminNavNodeEntry[];
  flattened: AdminNavLeaf[];
  layoutMasterNodes: MasterTreeNode[];
  layoutNodeStateById: Map<string, AdminMenuLayoutNodeState>;
  libraryItemMap: Map<string, AdminNavNodeEntry>;
  libraryItems: AdminNavNodeEntry[];
  sections: NavItem[];
};

export type UseAdminMenuSettingsDerivedStateResult = UseAdminMenuSettingsCollectionsState &
  Pick<
    UseAdminMenuSettingsPayloadState,
    'defaultCustomNav' | 'isDefaultState' | 'isDirty' | 'normalizedCustomNav'
  >;

const filterStringIds = (ids: unknown[]): string[] =>
  ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

const createSettingsValues = (
  settingsData: Map<string, string> | undefined
): SettingsValues => {
  const map = settingsData ?? new Map<string, string>();
  const sectionColorsRaw = parseAdminMenuJson<Record<string, string> | null>(
    map.get(ADMIN_MENU_SECTION_COLORS_KEY),
    null
  );

  return {
    favorites: filterStringIds(parseAdminMenuJson<unknown[]>(map.get(ADMIN_MENU_FAVORITES_KEY), [])),
    sectionColors:
      sectionColorsRaw !== null && typeof sectionColorsRaw === 'object' ? sectionColorsRaw : {},
    customEnabled: parseAdminMenuBoolean(map.get(ADMIN_MENU_CUSTOM_ENABLED_KEY), false),
    customNav: normalizeAdminMenuCustomNav(
      parseAdminMenuJson<AdminMenuCustomNode[]>(map.get(ADMIN_MENU_CUSTOM_NAV_KEY), [])
    ),
  };
};

const createSettingsPayload = (
  customNav: AdminMenuCustomNode[],
  customEnabled: boolean,
  defaultCustomNav: AdminMenuCustomNode[],
  favorites: string[],
  sectionColors: Record<string, string>
): string =>
  JSON.stringify({
    favorites,
    sectionColors,
    customEnabled,
    customNav: customNav.length > 0 ? customNav : defaultCustomNav,
  });

const filterAdminNavLeaves = (items: AdminNavLeaf[], query: string): AdminNavLeaf[] => {
  const normalizedQuery = normalizeAdminMenuSearch(query);
  return items
    .filter((item: AdminNavLeaf) => {
      const href = item.href ?? '';
      const searchable = [item.label, href, ...(item.keywords ?? []), ...item.parents].join(' ');
      return normalizeAdminMenuSearch(searchable).includes(normalizedQuery);
    })
    .sort((left: AdminNavLeaf, right: AdminNavLeaf) => left.label.localeCompare(right.label));
};

const filterLibraryNavItems = (
  items: AdminNavNodeEntry[],
  query: string
): AdminNavNodeEntry[] => {
  const normalizedQuery = normalizeAdminMenuSearch(query);
  return items
    .filter((item: AdminNavNodeEntry) =>
      normalizeAdminMenuSearch([item.label, item.href ?? '', ...item.parents].join(' ')).includes(
        normalizedQuery
      )
    )
    .sort((left: AdminNavNodeEntry, right: AdminNavNodeEntry) =>
      left.label.localeCompare(right.label)
    );
};

const createLayoutNodeState = (
  node: MasterTreeNode,
  libraryItemMap: Map<string, AdminNavNodeEntry>
): AdminMenuLayoutNodeState => {
  const metadata = readAdminMenuLayoutMetadata(node);
  const base = libraryItemMap.get(node.id);
  const href = metadata?.href ?? (typeof base?.href === 'string' ? base.href : null);
  const semantic =
    metadata?.semantic ?? (href !== null && href !== '' ? 'link' : 'group');

  return {
    id: node.id,
    label: node.name,
    semantic,
    href,
    isBuiltIn: metadata?.isBuiltIn ?? libraryItemMap.has(node.id),
  };
};

const buildLayoutNodeStateById = (
  layoutMasterNodes: MasterTreeNode[],
  libraryItemMap: Map<string, AdminNavNodeEntry>
): Map<string, AdminMenuLayoutNodeState> =>
  new Map(
    layoutMasterNodes.map((node: MasterTreeNode) => [
      node.id,
      createLayoutNodeState(node, libraryItemMap),
    ])
  );

export function useAdminMenuSettingsPayloads({
  baseNav,
  customEnabled,
  customNav,
  favorites,
  sectionColors,
  settingsData,
}: Omit<UseAdminMenuSettingsDerivedStateArgs, 'libraryQuery' | 'query'>): UseAdminMenuSettingsPayloadState {
  const defaultCustomNav = useMemo(() => adminNavToCustomNav(baseNav), [baseNav]);
  const normalizedCustomNav = useMemo(() => {
    const normalized = normalizeAdminMenuCustomNav(customNav);
    return normalized.length > 0 ? normalized : defaultCustomNav;
  }, [customNav, defaultCustomNav]);
  const settingsValues = useMemo(() => createSettingsValues(settingsData), [settingsData]);
  const settingsSnapshot = useMemo(
    () =>
      createSettingsPayload(
        settingsValues.customNav,
        settingsValues.customEnabled,
        defaultCustomNav,
        settingsValues.favorites,
        settingsValues.sectionColors
      ),
    [defaultCustomNav, settingsValues]
  );
  const defaultPayload = useMemo(
    () => createSettingsPayload([], false, defaultCustomNav, [], {}),
    [defaultCustomNav]
  );
  const baseline = useMemo(
    () =>
      createSettingsPayload(
        settingsValues.customNav,
        settingsValues.customEnabled,
        defaultCustomNav,
        settingsValues.favorites,
        settingsValues.sectionColors
      ),
    [defaultCustomNav, settingsValues]
  );
  const currentPayload = useMemo(
    () =>
      createSettingsPayload(normalizedCustomNav, customEnabled, defaultCustomNav, favorites, sectionColors),
    [customEnabled, defaultCustomNav, favorites, normalizedCustomNav, sectionColors]
  );

  return {
    baseline,
    currentPayload,
    defaultCustomNav,
    defaultPayload,
    isDefaultState: currentPayload === defaultPayload,
    isDirty: baseline !== currentPayload,
    normalizedCustomNav,
    settingsSnapshot,
    settingsValues,
  };
}

export function useAdminMenuSettingsCollections({
  baseNav,
  customNav,
  favorites,
  libraryQuery,
  normalizedCustomNav,
  query,
  customEnabled,
}: Pick<
  UseAdminMenuSettingsDerivedStateArgs,
  'baseNav' | 'customEnabled' | 'customNav' | 'favorites' | 'libraryQuery' | 'query'
> & {
  normalizedCustomNav: AdminMenuCustomNode[];
}): UseAdminMenuSettingsCollectionsState {
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
  const filteredItems = useMemo(() => filterAdminNavLeaves(flattened, query), [flattened, query]);
  const libraryItems = useMemo(() => flattenAdminNavNodes(baseNav), [baseNav]);
  const libraryItemMap = useMemo(
    () => new Map(libraryItems.map((item: AdminNavNodeEntry) => [item.id, item])),
    [libraryItems]
  );
  const layoutMasterNodes = useMemo(
    () => buildAdminMenuLayoutMasterNodes(customNav, libraryItemMap),
    [customNav, libraryItemMap]
  );
  const layoutNodeStateById = useMemo(
    () => buildLayoutNodeStateById(layoutMasterNodes, libraryItemMap),
    [layoutMasterNodes, libraryItemMap]
  );
  const customIds = useMemo(() => collectCustomIds(customNav), [customNav]);
  const filteredLibraryItems = useMemo(
    () => filterLibraryNavItems(libraryItems, libraryQuery),
    [libraryItems, libraryQuery]
  );

  return {
    customIds,
    favoritesList,
    favoritesSet,
    filteredItems,
    filteredLibraryItems,
    flattened,
    layoutMasterNodes,
    layoutNodeStateById,
    libraryItemMap,
    libraryItems,
    sections,
  };
}
