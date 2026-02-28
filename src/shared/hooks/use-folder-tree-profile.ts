'use client';

import { useMemo } from 'react';

import {
  FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
  getFolderTreeProfileV2Key,
  parseFolderTreeProfileV2Entry,
} from '@/features/foldertree/v2/settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  FOLDER_TREE_PROFILES_V2_SETTING_KEY,
  defaultFolderTreeProfilesV2,
  folderTreeInstanceValues,
  parseFolderTreeProfilesV2,
  type FolderTreeInstance,
  type FolderTreeProfileV2,
  type FolderTreeProfilesV2Map,
} from '@/shared/utils/folder-tree-profiles-v2';

export function useFolderTreeProfiles(): FolderTreeProfilesV2Map {
  const settingsStore = useSettingsStore();
  const migrationMarker = settingsStore.get(FOLDER_TREE_V2_MIGRATION_MARKER_KEY);
  const useLegacyFallback = !migrationMarker;
  const legacyRawProfiles = settingsStore.get(FOLDER_TREE_PROFILES_V2_SETTING_KEY);
  const legacyProfiles = useMemo(
    () => parseFolderTreeProfilesV2(legacyRawProfiles),
    [legacyRawProfiles]
  );

  const profileRawValues = folderTreeInstanceValues.map((instance: FolderTreeInstance) =>
    settingsStore.get(getFolderTreeProfileV2Key(instance))
  );

  return useMemo(
    () => {
      const profiles = {} as FolderTreeProfilesV2Map;
      folderTreeInstanceValues.forEach((instance: FolderTreeInstance, index: number) => {
        const raw = profileRawValues[index];
        profiles[instance] =
          raw !== undefined
            ? parseFolderTreeProfileV2Entry(instance, raw)
            : useLegacyFallback
              ? legacyProfiles[instance]
              : defaultFolderTreeProfilesV2[instance];
      });
      return profiles;
    },
    [
      legacyProfiles,
      useLegacyFallback,
      ...profileRawValues,
    ]
  );
}

export function useFolderTreeProfile(instance: FolderTreeInstance): FolderTreeProfileV2 {
  const profiles = useFolderTreeProfiles();
  return profiles[instance];
}
