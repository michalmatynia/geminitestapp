'use client';

import { type Dispatch, type SetStateAction } from 'react';

import type { NavItem } from '@/features/admin/components/menu/admin-menu-utils';
import type { AdminMenuCustomNode } from '@/shared/contracts/admin';

import {
  useAdminMenuSettingsCollections,
  type UseAdminMenuSettingsCollectionsState,
} from './admin-menu-settings-derived-collections';
import {
  useAdminMenuSettingsPayloads,
  useSyncAdminMenuSettingsState,
} from './admin-menu-settings-derived-state.helpers';

type UseAdminMenuSettingsDerivedStateArgs = {
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
};

type UseAdminMenuSettingsDerivedStateResult = UseAdminMenuSettingsCollectionsState & {
  defaultCustomNav: AdminMenuCustomNode[];
  isDefaultState: boolean;
  isDirty: boolean;
  normalizedCustomNav: AdminMenuCustomNode[];
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
}: UseAdminMenuSettingsDerivedStateArgs): UseAdminMenuSettingsDerivedStateResult {
  const {
    defaultCustomNav,
    isDefaultState,
    isDirty,
    normalizedCustomNav,
    settingsSnapshot,
    settingsValues,
  } = useAdminMenuSettingsPayloads({
    baseNav,
    customEnabled,
    customNav,
    favorites,
    sectionColors,
    settingsData,
  });
  useSyncAdminMenuSettingsState({
    defaultCustomNav,
    setCustomEnabled,
    setCustomNav,
    setFavorites,
    setSectionColors,
    settingsFetched,
    settingsSnapshot,
    settingsValues,
  });

  return {
    ...useAdminMenuSettingsCollections({
      baseNav,
      customEnabled,
      customNav,
      favorites,
      libraryQuery,
      normalizedCustomNav,
      query,
    }),
    defaultCustomNav,
    isDefaultState,
    isDirty,
    normalizedCustomNav,
  };
}
