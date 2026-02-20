import { describe, it, expect } from 'vitest';

import { findFolderById, findFolderParentId } from '@/features/foldertree/utils/tree';
import type { CategoryWithChildren } from '@/shared/contracts/notes';

const createMockCategory = (
  id: string,
  name: string,
  parentId: string | null = null,
  children: CategoryWithChildren[] = []
): CategoryWithChildren => ({
  id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  name,
  description: null,
  color: null,
  parentId,
  notebookId: null,
  themeId: null,
  sortIndex: null,
  children,
  notes: [],
  _count: { notes: 0 },
});

const mockFolders: CategoryWithChildren[] = [
  createMockCategory('f1', 'Folder 1', null, [
    createMockCategory('f1.1', 'Folder 1.1', 'f1'),
  ]),
  createMockCategory('f2', 'Folder 2'),
];

describe('foldertree utils', () => {
  describe('findFolderById', () => {
    it('finds a top-level folder', () => {
      const result = findFolderById(mockFolders, 'f1');
      expect(result?.id).toBe('f1');
      expect(result?.name).toBe('Folder 1');
    });

    it('finds a nested folder', () => {
      const result = findFolderById(mockFolders, 'f1.1');
      expect(result?.id).toBe('f1.1');
      expect(result?.name).toBe('Folder 1.1');
    });

    it('returns null if folder not found', () => {
      const result = findFolderById(mockFolders, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findFolderParentId', () => {
    it('returns null for top-level folder', () => {
      const result = findFolderParentId(mockFolders, 'f1');
      expect(result).toBeNull();
    });

    it('returns parent id for nested folder', () => {
      const result = findFolderParentId(mockFolders, 'f1.1');
      expect(result).toBe('f1');
    });

    it('returns null if folder not found', () => {
      const result = findFolderParentId(mockFolders, 'non-existent');
      expect(result).toBeNull();
    });
  });
});
