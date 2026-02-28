import { describe, expect, it, vi } from 'vitest';

import { toCategoryMasterNodeId } from '@/features/products/components/settings/category-master-tree';
import { createCategoryMasterTreeAdapter } from '@/features/products/components/settings/category-master-tree-adapter';
import type { MasterFolderTreePersistContext } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const categoryNode = (id: string, parentId: string | null, sortOrder: number): MasterTreeNode => ({
  id: toCategoryMasterNodeId(id),
  type: 'folder',
  kind: 'category',
  parentId,
  name: id,
  path: id,
  sortOrder,
});

const createContext = (
  previousNodes: MasterTreeNode[],
  nextNodes: MasterTreeNode[]
): MasterFolderTreePersistContext => ({
  previousNodes,
  nextNodes,
});

describe('createCategoryMasterTreeAdapter', () => {
  it('maps root-top moves to reorder-before payload', async () => {
    const applyReorderPayload = vi.fn(async () => undefined);
    const adapter = createCategoryMasterTreeAdapter({
      selectedCatalogId: null,
      applyReorderPayload,
    });
    const nextNodes: MasterTreeNode[] = [
      categoryNode('alpha', null, 0),
      categoryNode('beta', null, 1),
    ];

    await adapter.applyOperation?.(
      {
        type: 'move',
        nodeId: toCategoryMasterNodeId('beta'),
        targetParentId: null,
        targetIndex: 0,
      },
      createContext(nextNodes, nextNodes)
    );

    expect(applyReorderPayload).toHaveBeenCalledTimes(1);
    expect(applyReorderPayload).toHaveBeenCalledWith({
      categoryId: 'beta',
      parentId: null,
      position: 'before',
      targetId: 'alpha',
    });
  });

  it('maps folder moves to inside payload with selected catalog', async () => {
    const applyReorderPayload = vi.fn(async () => undefined);
    const adapter = createCategoryMasterTreeAdapter({
      selectedCatalogId: 'catalog-1',
      applyReorderPayload,
    });

    await adapter.applyOperation?.(
      {
        type: 'move',
        nodeId: toCategoryMasterNodeId('beta'),
        targetParentId: toCategoryMasterNodeId('alpha'),
        targetIndex: 1,
      },
      createContext([], [])
    );

    expect(applyReorderPayload).toHaveBeenCalledTimes(1);
    expect(applyReorderPayload).toHaveBeenCalledWith({
      categoryId: 'beta',
      parentId: 'alpha',
      position: 'inside',
      targetId: 'alpha',
      catalogId: 'catalog-1',
    });
  });

  it('uses previous nodes to resolve reorder parent payload', async () => {
    const applyReorderPayload = vi.fn(async () => undefined);
    const adapter = createCategoryMasterTreeAdapter({
      selectedCatalogId: null,
      applyReorderPayload,
    });
    const parentNodeId = toCategoryMasterNodeId('parent');
    const previousNodes: MasterTreeNode[] = [
      categoryNode('parent', null, 0),
      categoryNode('child', parentNodeId, 0),
      categoryNode('moving', null, 1),
    ];

    await adapter.applyOperation?.(
      {
        type: 'reorder',
        nodeId: toCategoryMasterNodeId('moving'),
        targetId: toCategoryMasterNodeId('child'),
        position: 'after',
      },
      createContext(previousNodes, previousNodes)
    );

    expect(applyReorderPayload).toHaveBeenCalledTimes(1);
    expect(applyReorderPayload).toHaveBeenCalledWith({
      categoryId: 'moving',
      parentId: 'parent',
      position: 'after',
      targetId: 'child',
    });
  });
});
