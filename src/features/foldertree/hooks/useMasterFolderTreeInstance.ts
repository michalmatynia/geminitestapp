'use client';

import { useConfiguredMasterFolderTree } from '@/features/foldertree/master/useConfiguredMasterFolderTree';
import type { UseConfiguredMasterFolderTreeOptions } from '@/features/foldertree/master/useConfiguredMasterFolderTree';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

import { useMasterFolderTreeConfig } from './useMasterFolderTreeConfig';

export type UseMasterFolderTreeInstanceOptions = Omit<
  UseConfiguredMasterFolderTreeOptions,
  'profile'
> & {
  instance: FolderTreeInstance;
};

export function useMasterFolderTreeInstance({
  instance,
  ...controllerOptions
}: UseMasterFolderTreeInstanceOptions): {
  profile: ReturnType<typeof useMasterFolderTreeConfig>['profile'];
  appearance: ReturnType<typeof useMasterFolderTreeConfig>['appearance'];
  controller: ReturnType<typeof useConfiguredMasterFolderTree>;
} {
  const { profile, appearance } = useMasterFolderTreeConfig(instance);
  const controller = useConfiguredMasterFolderTree({
    ...controllerOptions,
    profile,
  });

  return {
    profile,
    appearance,
    controller,
  };
}
