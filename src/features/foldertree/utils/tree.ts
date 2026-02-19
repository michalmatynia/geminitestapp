import type { CategoryWithChildren } from '@/shared/types/domain/notes';
import {
  findTreeNodeById,
  findTreeNodeParentId,
} from '@/shared/utils/tree-operations';

export const findFolderById = (
  foldersToScan: CategoryWithChildren[],
  id: string
): CategoryWithChildren | null => {
  return findTreeNodeById<CategoryWithChildren>(foldersToScan, id);
};

export const findFolderParentId = (
  foldersToScan: CategoryWithChildren[],
  id: string,
  parentId: string | null = null
): string | null => {
  return findTreeNodeParentId<CategoryWithChildren>(foldersToScan, id, parentId);
};
