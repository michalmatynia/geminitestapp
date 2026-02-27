'use client';

import type {
  MasterFolderTreeController,
  UseMasterFolderTreeOptions,
} from '@/shared/contracts/master-folder-tree';

import {
  useFolderTreeInstanceV2,
  type UseFolderTreeInstanceV2Options,
} from '../v2/hooks/useFolderTreeInstanceV2';

export function useMasterFolderTree(
  options: UseMasterFolderTreeOptions
): MasterFolderTreeController {
  return useFolderTreeInstanceV2(options as UseFolderTreeInstanceV2Options);
}
