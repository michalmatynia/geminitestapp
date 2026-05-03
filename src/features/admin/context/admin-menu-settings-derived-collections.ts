'use client';

import { useMemo } from 'react';

import {
  buildAdminMenuFromCustomNav,
  flattenAdminNav,
  getAdminMenuSections,
  type NavItem,
} from '@/features/admin/components/menu/admin-menu-utils';
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

type UseAdminMenuSettingsCollectionsArgs = {
  baseNav: NavItem[];
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
  favorites: string[];
  libraryQuery: string;
  normalizedCustomNav: AdminMenuCustomNode[];
  query: string;
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

const filterAdminNavLeaves = (items: AdminNavLeaf[], query: string): AdminNavLeaf[] => {
  const normalizedQuery = normalizeAdminMenuSearch(query);
  return items
    .filter((item: AdminNavLeaf) =>
      normalizeAdminMenuSearch([item.label, item.href ?? '', ...(item.keywords ?? []), ...item.parents].join(' ')).includes(normalizedQuery)
    )
    .sort((left: AdminNavLeaf, right: AdminNavLeaf) => left.label.localeCompare(right.label));
};

const filterLibraryNavItems = (items: AdminNavNodeEntry[], query: string): AdminNavNodeEntry[] => {
  const normalizedQuery = normalizeAdminMenuSearch(query);
  return items
    .filter((item: AdminNavNodeEntry) =>
      normalizeAdminMenuSearch([item.label, item.href ?? '', ...item.parents].join(' ')).includes(normalizedQuery)
    )
    .sort((left: AdminNavNodeEntry, right: AdminNavNodeEntry) =>
      left.label.localeCompare(right.label)
    );
};

const resolveLayoutNodeHref = (
  node: MasterTreeNode,
  libraryItemMap: Map<string, AdminNavNodeEntry>
): string | null => {
  const metadata = readAdminMenuLayoutMetadata(node);
  const base = libraryItemMap.get(node.id);
  return metadata?.href ?? (typeof base?.href === 'string' ? base.href : null);
};

const resolveLayoutNodeSemantic = (
  node: MasterTreeNode,
  href: string | null
): 'link' | 'group' => {
  const metadata = readAdminMenuLayoutMetadata(node);
  if (metadata?.semantic !== undefined) {
    return metadata.semantic;
  }
  return href !== null && href !== '' ? 'link' : 'group';
};

const resolveLayoutNodeIsBuiltIn = (
  node: MasterTreeNode,
  libraryItemMap: Map<string, AdminNavNodeEntry>
): boolean => {
  const metadata = readAdminMenuLayoutMetadata(node);
  return metadata?.isBuiltIn ?? libraryItemMap.has(node.id);
};

const createLayoutNodeState = (
  node: MasterTreeNode,
  libraryItemMap: Map<string, AdminNavNodeEntry>
): AdminMenuLayoutNodeState => {
  const href = resolveLayoutNodeHref(node, libraryItemMap);
  return {
    id: node.id,
    label: node.name,
    semantic: resolveLayoutNodeSemantic(node, href),
    href,
    isBuiltIn: resolveLayoutNodeIsBuiltIn(node, libraryItemMap),
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

export function useAdminMenuSettingsCollections({
  baseNav,
  customEnabled,
  customNav,
  favorites,
  libraryQuery,
  normalizedCustomNav,
  query,
}: UseAdminMenuSettingsCollectionsArgs): UseAdminMenuSettingsCollectionsState {
  const menuNav = useMemo(() => (customEnabled ? buildAdminMenuFromCustomNav(normalizedCustomNav, baseNav) : baseNav), [baseNav, customEnabled, normalizedCustomNav]);
  const sections = useMemo(() => getAdminMenuSections(menuNav), [menuNav]);
  const flattened = useMemo(() => flattenAdminNav(menuNav), [menuNav]);
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const favoritesList = useMemo(() => favorites.map((id: string) => flattened.find((item: AdminNavLeaf) => item.id === id)).filter((item: AdminNavLeaf | undefined): item is AdminNavLeaf => item !== undefined), [favorites, flattened]);
  const filteredItems = useMemo(() => filterAdminNavLeaves(flattened, query), [flattened, query]);
  const libraryItems = useMemo(() => flattenAdminNavNodes(baseNav), [baseNav]);
  const libraryItemMap = useMemo(() => new Map(libraryItems.map((item: AdminNavNodeEntry) => [item.id, item])), [libraryItems]);
  const layoutMasterNodes = useMemo(() => buildAdminMenuLayoutMasterNodes(customNav, libraryItemMap), [customNav, libraryItemMap]);
  const layoutNodeStateById = useMemo(() => buildLayoutNodeStateById(layoutMasterNodes, libraryItemMap), [layoutMasterNodes, libraryItemMap]);
  const customIds = useMemo(() => collectCustomIds(customNav), [customNav]);
  const filteredLibraryItems = useMemo(() => filterLibraryNavItems(libraryItems, libraryQuery), [libraryItems, libraryQuery]);

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
