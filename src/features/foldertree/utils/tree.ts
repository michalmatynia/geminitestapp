import type { CategoryWithChildren } from '@/shared/contracts/notes';
import {
  findTreeNodeById,
  findTreeNodeParentId,
} from '@/shared/utils/tree-operations';

export const findFolderById = (
  foldersToScan: CategoryWithChildren[],
  id: string
): CategoryWithChildren | null => {
  return findTreeNodeById<any>(foldersToScan, id);
};

export const findFolderParentId = (
  foldersToScan: CategoryWithChildren[],
  id: string,
  parentId: string | null = null
): string | null => {
  return findTreeNodeParentId<any>(foldersToScan, id, parentId);
};
