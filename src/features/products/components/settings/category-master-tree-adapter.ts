import type { ReorderCategoryPayload } from '@/features/products/api/settings';
import type { CreateMasterFolderTreeAdapterOptions } from '@/shared/contracts/master-folder-tree';
import { createMasterFolderTreeAdapterV3 } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { decodeCategoryMasterNodeId, fromCategoryMasterNodeId } from './category-master-tree';

export type CategoryMasterTreeAdapterOptions = {
  selectedCatalogId: string | null;
  applyReorderPayload: (payload: ReorderCategoryPayload) => Promise<void>;
};

type CategoryMasterTreeHandlers = NonNullable<CreateMasterFolderTreeAdapterOptions<string>['handlers']>;
type CategoryMasterTreeMoveInput = Parameters<NonNullable<CategoryMasterTreeHandlers['onMove']>>[0];
type CategoryMasterTreeReorderInput = Parameters<
  NonNullable<CategoryMasterTreeHandlers['onReorder']>
>[0];
type CatalogPayload = Partial<Pick<ReorderCategoryPayload, 'catalogId'>>;

const buildCatalogPayload = (selectedCatalogId: string | null): CatalogPayload => {
  if (selectedCatalogId === null || selectedCatalogId === '') return {};
  return { catalogId: selectedCatalogId };
};

const findFirstRootSiblingId = (
  nextNodes: MasterTreeNode[],
  currentNodeId: string
): string | null =>
  nextNodes
    .filter((entry: MasterTreeNode) => entry.parentId === null)
    .sort((left: MasterTreeNode, right: MasterTreeNode) => left.sortOrder - right.sortOrder)
    .map((entry: MasterTreeNode): string | null => fromCategoryMasterNodeId(entry.id))
    .find(
      (categoryId: string | null): boolean =>
        categoryId !== null && categoryId !== '' && categoryId !== currentNodeId
    ) ?? null;

const shouldPlaceBeforeFirstRoot = (
  targetParentId: string | null,
  targetIndex: number
): boolean => targetParentId === null && targetIndex === 0;

const handleCategoryMove = async ({
  input,
  selectedCatalogId,
  applyReorderPayload,
}: {
  input: CategoryMasterTreeMoveInput;
  selectedCatalogId: string | null;
  applyReorderPayload: (payload: ReorderCategoryPayload) => Promise<void>;
}): Promise<void> => {
  const { operation, context, node, targetParent } = input;
  const catalogPayload = buildCatalogPayload(selectedCatalogId);
  const targetParentId = targetParent?.id ?? null;

  if (shouldPlaceBeforeFirstRoot(targetParentId, operation.targetIndex ?? -1)) {
    const firstRootSiblingId = findFirstRootSiblingId(context.nextNodes, node.id);
    if (firstRootSiblingId !== null) {
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
};

const resolveReorderTargetParentId = (
  previousNodes: MasterTreeNode[],
  targetId: string
): string | null => {
  const targetNode = previousNodes.find((entry: MasterTreeNode): boolean => entry.id === targetId);
  const parentNodeId = targetNode?.parentId ?? null;
  if (parentNodeId === null || parentNodeId === '') return null;
  return fromCategoryMasterNodeId(parentNodeId);
};

const handleCategoryReorder = async ({
  input,
  selectedCatalogId,
  applyReorderPayload,
}: {
  input: CategoryMasterTreeReorderInput;
  selectedCatalogId: string | null;
  applyReorderPayload: (payload: ReorderCategoryPayload) => Promise<void>;
}): Promise<void> => {
  const { operation, context, node, target } = input;
  const catalogPayload = buildCatalogPayload(selectedCatalogId);
  const targetParentId = resolveReorderTargetParentId(context.previousNodes, operation.targetId);

  await applyReorderPayload({
    categoryId: node.id,
    parentId: targetParentId,
    position: operation.position,
    targetId: target.id,
    ...catalogPayload,
  });
};

export const createCategoryMasterTreeAdapter = ({
  selectedCatalogId,
  applyReorderPayload,
}: CategoryMasterTreeAdapterOptions): ReturnType<typeof createMasterFolderTreeAdapterV3> =>
  createMasterFolderTreeAdapterV3({
    decodeNodeId: decodeCategoryMasterNodeId,
    handlers: {
      onMove: async (input): Promise<void> =>
        await handleCategoryMove({ input, selectedCatalogId, applyReorderPayload }),
      onReorder: async (input): Promise<void> =>
        await handleCategoryReorder({ input, selectedCatalogId, applyReorderPayload }),
    },
  });
