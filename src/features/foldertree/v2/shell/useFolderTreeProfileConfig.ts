import type { FolderTreeProfileV2 } from '@/shared/contracts/master-folder-tree';
import { useFolderTreeProfile } from '../hooks/useFolderTreeProfile';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import { useFolderTreeAppearance, type FolderTreeAppearance } from './useFolderTreeAppearance';

export function useFolderTreeProfileConfig(instance: FolderTreeInstance): {
  profile: FolderTreeProfileV2;
  appearance: FolderTreeAppearance;
} {
  const profile = useFolderTreeProfile(instance);
  const appearance = useFolderTreeAppearance(profile);

  return { profile, appearance };
}
