'use client';

import { useMemo } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  FOLDER_TREE_PROFILES_SETTING_KEY,
  parseFolderTreeProfiles,
  type FolderTreeInstance,
  type FolderTreeProfile,
  type FolderTreeProfilesMap,
} from '@/shared/utils/folder-tree-profiles';

export function useFolderTreeProfiles(): FolderTreeProfilesMap {
  const settingsStore = useSettingsStore();
  const raw = settingsStore.get(FOLDER_TREE_PROFILES_SETTING_KEY);

  return useMemo(() => parseFolderTreeProfiles(raw), [raw]);
}

export function useFolderTreeProfile(instance: FolderTreeInstance): FolderTreeProfile {
  const profiles = useFolderTreeProfiles();
  return profiles[instance];
}
