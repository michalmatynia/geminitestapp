import { createMasterFolderTreeAdapter } from '@/features/foldertree';
import type { ReorderCategoryPayload } from '@/features/products/api/settings';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  decodeCategoryMasterNodeId,
  fromCategoryMasterNodeId,
} from './category-master-tree';

export type CategoryMasterTreeAdapterOptions = {
  selectedCatalogId: string | null;
  applyReorderPayload: (payload: ReorderCategoryPayload) => Promise<void>;
};

export const createCategoryMasterTreeAdapter = ({
  selectedCatalogId,
  applyReorderPayload,
}: CategoryMasterTreeAdapterOptions) =>
  createMasterFolderTreeAdapter({
    decodeNodeId: decodeCategoryMasterNodeId,
    handlers: {
      onMove: async ({ operation, context, node, targetParent }): Promise<void> => {
        const catalogPayload = selectedCatalogId ? { catalogId: selectedCatalogId } : {};
        const targetParentId = targetParent?.id ?? null;

        if (targetParentId === null && operation.targetIndex === 0) {
          const firstRootSiblingId =
            context.nextNodes
              .filter((entry: MasterTreeNode) => entry.parentId === null)
              .sort((left: MasterTreeNode, right: MasterTreeNode) => left.sortOrder - right.sortOrder)
              .map((entry: MasterTreeNode): string | null => fromCategoryMasterNodeId(entry.id))
              .find(
                (categoryId: string | null): boolean => Boolean(categoryId) && categoryId !== node.id
              ) ?? null;

          if (firstRootSiblingId) {
            await applyReorderPayload({
              categoryId: node.id,
              parentId: null,
              position: 'before',
              targetId: firstRootSiblingId,
              ...catalogPayload,
            });
            return;
          }
        }

        await applyReorderPayload({
          categoryId: node.id,
          parentId: targetParentId,
          position: 'inside',
          targetId: targetParentId,
          ...catalogPayload,
        });
      },
      onReorder: async ({ operation, context, node, target }): Promise<void> => {
        const catalogPayload = selectedCatalogId ? { catalogId: selectedCatalogId } : {};
        const targetNode = context.previousNodes.find(
          (entry: MasterTreeNode): boolean => entry.id === operation.targetId
        );
        const targetParentId = targetNode?.parentId
          ? fromCategoryMasterNodeId(targetNode.parentId)
          : null;

        await applyReorderPayload({
          categoryId: node.id,
          parentId: targetParentId,
          position: operation.position,
          targetId: target.id,
          ...catalogPayload,
        });
      },
    },
  });
