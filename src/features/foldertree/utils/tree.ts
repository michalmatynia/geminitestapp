import type { CategoryWithChildren } from '@/shared/types/domain/notes';

export const findFolderById = (
  foldersToScan: CategoryWithChildren[],
  id: string
): CategoryWithChildren | null => {
  for (const node of foldersToScan) {
    if (node.id === id) return node;

    const found = findFolderById(node.children, id);

    if (found) return found;
  }

  return null;
};

export const findFolderParentId = (
  foldersToScan: CategoryWithChildren[],
  id: string,
  parentId: string | null = null
): string | null => {
  for (const node of foldersToScan) {
    if (node.id === id) return parentId;

    const found = findFolderParentId(node.children, id, node.id);

    if (found !== null) return found;
  }

  return null;
};
