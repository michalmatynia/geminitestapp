'use client';

import type { FolderTreeProfileV2 } from '@/shared/contracts/master-folder-tree';
import { useFolderTreeProfile } from '@/shared/hooks/use-folder-tree-profile';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import { useMasterFolderTreeAppearance } from './useMasterFolderTreeAppearance';

export function useMasterFolderTreeConfig(instance: FolderTreeInstance): {
  profile: FolderTreeProfileV2;
  appearance: ReturnType<typeof useMasterFolderTreeAppearance>;
} {
  const profile = useFolderTreeProfile(instance) as unknown as FolderTreeProfileV2;
  const appearance = useMasterFolderTreeAppearance(profile);

  return { profile, appearance };
}
