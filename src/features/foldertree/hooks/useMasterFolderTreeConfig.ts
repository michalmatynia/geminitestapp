'use client';

import { useFolderTreeProfile } from '@/shared/hooks/use-folder-tree-profile';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import { useMasterFolderTreeAppearance } from './useMasterFolderTreeAppearance';

export function useMasterFolderTreeConfig(instance: FolderTreeInstance): {
  profile: ReturnType<typeof useFolderTreeProfile>;
  appearance: ReturnType<typeof useMasterFolderTreeAppearance>;
} {
  const profile = useFolderTreeProfile(instance);
  const appearance = useMasterFolderTreeAppearance(profile);

  return { profile, appearance };
}
