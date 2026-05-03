'use client';

import { useCallback, useMemo, useState, type Dispatch, type MouseEvent, type SetStateAction } from 'react';

import { buildAdminNav } from '@/features/admin/components/admin-menu-nav';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
} from '@/features/admin/constants/admin-menu-settings';
import type {
  AdminMenuCustomNode,
  AdminNavLeaf,
  AdminNavNodeEntry,
} from '@/shared/contracts/admin';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type {
  AdminMenuSettingsActionsContextValue,
  AdminMenuSettingsStateContextValue,
} from './AdminMenuSettingsContext.types';
import { useCustomNavMutationActions } from './admin-menu-settings-custom-nav-actions';
import { useAdminMenuSettingsDerivedState } from './useAdminMenuSettingsDerivedState';

type ProviderState = {
  customEnabled: boolean;
  customIds: Set<string>;
  customNav: AdminMenuCustomNode[];
  defaultCustomNav: AdminMenuCustomNode[];
  favorites: string[];
  favoritesList: AdminNavLeaf[];
  favoritesSet: Set<string>;
  filteredItems: AdminNavLeaf[];
  filteredLibraryItems: AdminNavNodeEntry[];
  flattened: AdminNavLeaf[];
  isDefaultState: boolean;
  isDirty: boolean;
  isSaving: boolean;
  layoutMasterNodes: MasterTreeNode[];
  layoutNodeStateById: AdminMenuSettingsStateContextValue['layoutNodeStateById'];
  libraryItemMap: Map<string, AdminNavNodeEntry>;
  libraryItems: AdminNavNodeEntry[];
  libraryQuery: string;
  normalizedCustomNav: AdminMenuCustomNode[];
  query: string;
  sectionColors: Record<string, string>;
  sections: AdminMenuSettingsStateContextValue['sections'];
  setCustomEnabled: Dispatch<SetStateAction<boolean>>;
  setCustomNav: Dispatch<SetStateAction<AdminMenuCustomNode[]>>;
  setFavorites: Dispatch<SetStateAction<string[]>>;
  setLibraryQuery: Dispatch<SetStateAction<string>>;
  setQuery: Dispatch<SetStateAction<string>>;
  setSectionColors: Dispatch<SetStateAction<Record<string, string>>>;
  toast: ReturnType<typeof useToast>['toast'];
  updateSettingsBulk: ReturnType<typeof useUpdateSettingsBulk>;
};

function useAdminMenuSettingsProviderState(): ProviderState {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSettingsBulk = useUpdateSettingsBulk();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sectionColors, setSectionColors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [customEnabled, setCustomEnabled] = useState(false);
  const [customNav, setCustomNav] = useState<AdminMenuCustomNode[]>([]);
  const [libraryQuery, setLibraryQuery] = useState('');
  const noopClick = useCallback((event: MouseEvent<HTMLAnchorElement>): void => event.preventDefault(), []);
  const baseNav = useMemo(() => buildAdminNav({ onOpenChat: noopClick, onCreatePageClick: () => {} }), [noopClick]);
  const derivedState = useAdminMenuSettingsDerivedState({
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

  return {
    ...derivedState,
    customEnabled,
    customNav,
    favorites,
    isSaving: updateSettingsBulk.isPending,
    libraryQuery,
    query,
    sectionColors,
    setCustomEnabled,
    setCustomNav,
    setFavorites,
    setLibraryQuery,
    setQuery,
    setSectionColors,
    toast,
    updateSettingsBulk,
  };
}

function useFavoriteAndColorActions({
  setFavorites,
  setSectionColors,
}: Pick<ProviderState, 'setFavorites' | 'setSectionColors'>): Pick<
  AdminMenuSettingsActionsContextValue,
  'handleToggleFavorite' | 'moveFavorite' | 'updateSectionColor'
> {
  const handleToggleFavorite = useCallback((id: string, checked: boolean): void => {
    setFavorites((previous: string[]) => {
      if (checked) {
        return previous.includes(id) ? previous : [...previous, id];
      }
      return previous.filter((favoriteId: string) => favoriteId !== id);
    });
  }, [setFavorites]);

  const moveFavorite = useCallback((id: string, direction: 'up' | 'down'): void => {
    setFavorites((previous: string[]) => {
      const index = previous.indexOf(id);
      if (index === -1) return previous;
      const next = [...previous];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return previous;
      const [removed] = next.splice(index, 1);
      if (removed === undefined) return previous;
      next.splice(targetIndex, 0, removed);
      return next;
    });
  }, [setFavorites]);

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
  }, [setSectionColors]);

  return { handleToggleFavorite, moveFavorite, updateSectionColor };
}

function usePersistenceActions({
  customEnabled,
  defaultCustomNav,
  favorites,
  flattened,
  normalizedCustomNav,
  sectionColors,
  sections,
  setCustomEnabled,
  setCustomNav,
  setFavorites,
  setSectionColors,
  toast,
  updateSettingsBulk,
}: Pick<
  ProviderState,
  | 'customEnabled'
  | 'defaultCustomNav'
  | 'favorites'
  | 'flattened'
  | 'normalizedCustomNav'
  | 'sectionColors'
  | 'sections'
  | 'setCustomEnabled'
  | 'setCustomNav'
  | 'setFavorites'
  | 'setSectionColors'
  | 'toast'
  | 'updateSettingsBulk'
>): Pick<AdminMenuSettingsActionsContextValue, 'handleReset' | 'handleSave'> {
  const handleSave = useCallback(async (): Promise<void> => {
    try {
      const validFavorites = favorites.filter((id: string) => flattened.some((item: AdminNavLeaf) => item.id === id));
      const sectionIds = new Set(sections.map((section: { id: string }) => section.id));
      const validSectionColors = Object.fromEntries(Object.entries(sectionColors).filter(([sectionId]: [string, string]) => sectionIds.has(sectionId)));
      await updateSettingsBulk.mutateAsync([
        { key: ADMIN_MENU_FAVORITES_KEY, value: JSON.stringify(validFavorites) },
        { key: ADMIN_MENU_SECTION_COLORS_KEY, value: JSON.stringify(validSectionColors) },
        { key: ADMIN_MENU_CUSTOM_ENABLED_KEY, value: JSON.stringify(customEnabled) },
        { key: ADMIN_MENU_CUSTOM_NAV_KEY, value: JSON.stringify(normalizedCustomNav) },
      ]);
      toast('Admin menu settings saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'AdminMenuSettingsPage', action: 'save' });
      toast(error instanceof Error ? error.message : 'Failed to save admin menu settings.', { variant: 'error' });
    }
  }, [customEnabled, favorites, flattened, normalizedCustomNav, sectionColors, sections, toast, updateSettingsBulk]);

  const handleReset = useCallback((): void => {
    setFavorites([]);
    setSectionColors({});
    setCustomEnabled(false);
    setCustomNav(defaultCustomNav);
  }, [defaultCustomNav, setCustomEnabled, setCustomNav, setFavorites, setSectionColors]);

  return { handleReset, handleSave };
}

export function useAdminMenuSettingsProviderData(): {
  actionsValue: AdminMenuSettingsActionsContextValue;
  stateValue: AdminMenuSettingsStateContextValue;
} {
  const providerState = useAdminMenuSettingsProviderState();
  const favoriteAndColorActions = useFavoriteAndColorActions(providerState);
  const customNavActions = useCustomNavMutationActions(providerState);
  const persistenceActions = usePersistenceActions(providerState);
  const stateValue = useMemo<AdminMenuSettingsStateContextValue>(() => ({
    favorites: providerState.favorites,
    sectionColors: providerState.sectionColors,
    customEnabled: providerState.customEnabled,
    customNav: providerState.customNav,
    query: providerState.query,
    libraryQuery: providerState.libraryQuery,
    sections: providerState.sections,
    flattened: providerState.flattened,
    favoritesSet: providerState.favoritesSet,
    favoritesList: providerState.favoritesList,
    filteredItems: providerState.filteredItems,
    layoutMasterNodes: providerState.layoutMasterNodes,
    layoutNodeStateById: providerState.layoutNodeStateById,
    libraryItems: providerState.libraryItems,
    libraryItemMap: providerState.libraryItemMap,
    customIds: providerState.customIds,
    filteredLibraryItems: providerState.filteredLibraryItems,
    isDirty: providerState.isDirty,
    isDefaultState: providerState.isDefaultState,
    isSaving: providerState.isSaving,
  }), [providerState]);
  const actionsValue = useMemo<AdminMenuSettingsActionsContextValue>(() => ({
    setQuery: providerState.setQuery,
    setLibraryQuery: providerState.setLibraryQuery,
    setCustomEnabled: providerState.setCustomEnabled,
    ...favoriteAndColorActions,
    ...customNavActions,
    ...persistenceActions,
  }), [customNavActions, favoriteAndColorActions, persistenceActions, providerState.setCustomEnabled, providerState.setLibraryQuery, providerState.setQuery]);

  return { actionsValue, stateValue };
}
