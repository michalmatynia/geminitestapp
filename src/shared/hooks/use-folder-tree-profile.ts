'use client';

import { useMemo } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles';
import {
  FOLDER_TREE_PROFILES_V2_SETTING_KEY,
  parseFolderTreeProfilesV2,
  type FolderTreeProfileV2,
  type FolderTreeProfilesV2Map,
} from '@/shared/utils/folder-tree-profiles-v2';

export function useFolderTreeProfiles(): FolderTreeProfilesV2Map {
  const settingsStore = useSettingsStore();
  const rawV2 = settingsStore.get(FOLDER_TREE_PROFILES_V2_SETTING_KEY);

  return useMemo(() => parseFolderTreeProfilesV2(rawV2), [rawV2]);
}

export function useFolderTreeProfile(instance: FolderTreeInstance): FolderTreeProfileV2 {
  const profiles = useFolderTreeProfiles();
  return profiles[instance];
}
