import type { CategoryWithChildren } from '@/shared/contracts/notes';

export const getCategoryIdsWithDescendants = (
  targetId: string,
  categories: CategoryWithChildren[]
): string[] => {
  const collectAllDescendantIds = (node: CategoryWithChildren): string[] => {
    const ids = [node.id];
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        ids.push(...collectAllDescendantIds(child));
      }
    }
    return ids;
  };

  const findCategory = (cats: CategoryWithChildren[]): CategoryWithChildren | null => {
    for (const cat of cats) {
      if (cat.id === targetId) {
        return cat;
      }
      if (cat.children && cat.children.length > 0) {
        const found = findCategory(cat.children);
        if (found) return found;
      }
    }
    return null;
  };

  const targetCategory = findCategory(categories);
  if (!targetCategory) {
    return [];
  }

  return collectAllDescendantIds(targetCategory);
};

export const buildBreadcrumbPath = (
  categoryId: string | null,
  noteTitle: string | null,
  categories: CategoryWithChildren[]
): Array<{ id: string | null; name: string; isNote?: boolean }> => {
  const path: Array<{ id: string | null; name: string; isNote?: boolean }> = [];

  const findPath = (cats: CategoryWithChildren[], targetId: string): boolean => {
    for (const cat of cats) {
      if (cat.id === targetId) {
        path.unshift({ id: cat.id, name: cat.name });
        return true;
      }
      if (cat.children && cat.children.length > 0) {
        const found = findPath(cat.children, targetId);
        if (found) {
          path.unshift({ id: cat.id, name: cat.name });
          return true;
        }
      }
    }
    return false;
  };

  if (categoryId) {
    findPath(categories, categoryId);
  }

  if (noteTitle) {
    path.push({ id: null, name: noteTitle, isNote: true });
  }

  return path;
};
