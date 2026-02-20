import { describe, expect, it } from 'vitest';

import {
  buildMasterNodesFromCategoryTree,
  fromCategoryMasterNodeId,
  isCategoryMasterNodeId,
  toCategoryMasterNodeId,
} from '@/features/products/components/settings/category-master-tree';
import type { ProductCategoryWithChildren } from '@/shared/contracts/products';

const createCategory = (
  overrides: Partial<ProductCategoryWithChildren>
): ProductCategoryWithChildren => ({
  id: 'category-id',
  name: 'Category',
  description: null,
  color: null,
  parentId: null,
  catalogId: 'catalog-1',
  sortIndex: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  children: [],
  ...overrides,
});

describe('category-master-tree utils', () => {
  it('converts category ids to and from master node ids', () => {
    const nodeId = toCategoryMasterNodeId('cat-123');
    expect(nodeId).toBe('category:cat-123');
    expect(isCategoryMasterNodeId(nodeId)).toBe(true);
    expect(fromCategoryMasterNodeId(nodeId)).toBe('cat-123');
    expect(fromCategoryMasterNodeId('folder:cat-123')).toBeNull();
  });

  it('builds hierarchical master nodes from category tree', () => {
    const nodes = buildMasterNodesFromCategoryTree([
      createCategory({
        id: 'root',
        name: 'Root',
        children: [
          createCategory({
            id: 'child',
            name: 'Child',
            parentId: 'root',
          }),
        ],
      }),
    ]);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({
      id: 'category:root',
      parentId: null,
      type: 'folder',
      kind: 'category',
      name: 'Root',
      sortOrder: 0,
    });
    expect(nodes[1]).toMatchObject({
      id: 'category:child',
      parentId: 'category:root',
      type: 'folder',
      kind: 'category',
      name: 'Child',
      sortOrder: 0,
    });
  });
});
