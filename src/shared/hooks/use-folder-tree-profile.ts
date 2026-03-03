'use client';

import { useMemo } from 'react';

import {
  getFolderTreeProfileV2Key,
  parseFolderTreeProfileV2Entry,
} from '@/features/foldertree/v2/settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  defaultFolderTreeProfilesV2,
  folderTreeInstanceValues,
  type FolderTreeInstance,
  type FolderTreeProfileV2,
  type FolderTreeProfilesV2Map,
} from '@/shared/utils/folder-tree-profiles-v2';

export function useFolderTreeProfiles(): FolderTreeProfilesV2Map {
  const settingsStore = useSettingsStore();

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
            : defaultFolderTreeProfilesV2[instance];
      });
      return profiles;
    },
    [...profileRawValues]
  );
}

export function useFolderTreeProfile(instance: FolderTreeInstance): FolderTreeProfileV2 {
  const profiles = useFolderTreeProfiles();
  return profiles[instance];
}
