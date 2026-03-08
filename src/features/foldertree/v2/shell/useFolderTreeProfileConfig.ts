'use client';

import type { FolderTreeProfileV2 } from '@/shared/contracts/master-folder-tree';
import { useFolderTreeProfile } from '@/shared/hooks/use-folder-tree-profile';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import { useFolderTreeAppearance, type FolderTreeAppearance } from './useFolderTreeAppearance';

export function useFolderTreeProfileConfig(instance: FolderTreeInstance): {
  profile: FolderTreeProfileV2;
  appearance: FolderTreeAppearance;
} {
  const profile = useFolderTreeProfile(instance) as FolderTreeProfileV2;
  const appearance = useFolderTreeAppearance(profile);

  return { profile, appearance };
}
