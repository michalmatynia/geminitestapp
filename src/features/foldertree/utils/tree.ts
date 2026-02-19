import type { CategoryWithChildren } from '@/shared/types/domain/notes';
import {
  findTreeNodeById,
  findTreeNodeParentId,
} from '@/shared/utils/tree-operations';

export const findFolderById = (
  foldersToScan: CategoryWithChildren[],
  id: string
): CategoryWithChildren | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return findTreeNodeById(foldersToScan as any, id);
};

export const findFolderParentId = (
  foldersToScan: CategoryWithChildren[],
  id: string,
  parentId: string | null = null
): string | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return findTreeNodeParentId(foldersToScan as any, id, parentId);
};
