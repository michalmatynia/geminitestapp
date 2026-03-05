import type { ProductCategoryWithChildren } from '@/shared/contracts/products';
import type { DecodedMasterTreeNode as SharedDecodedMasterTreeNode } from '@/shared/contracts/master-folder-tree';
import type {
  MasterTreeDropPosition,
  MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';

const CATEGORY_NODE_PREFIX = 'category:';

type CategoryMasterNodeRef = SharedDecodedMasterTreeNode<'category'>;

export type { CategoryMasterNodeRef };

export type CategoryDropTarget = {
  parentId: string | null;
  position: Extract<MasterTreeDropPosition, 'inside' | 'before' | 'after'>;
  targetId: string | null;
};

export const toCategoryMasterNodeId = (categoryId: string): string =>
  `${CATEGORY_NODE_PREFIX}${categoryId}`;

export const isCategoryMasterNodeId = (value: string): boolean =>
  value.startsWith(CATEGORY_NODE_PREFIX);

export const fromCategoryMasterNodeId = (value: string): string | null =>
  isCategoryMasterNodeId(value) ? value.slice(CATEGORY_NODE_PREFIX.length) : null;

export const decodeCategoryMasterNodeId = (value: string): CategoryMasterNodeRef | null => {
  const categoryId = fromCategoryMasterNodeId(value);
  if (!categoryId) return null;
  return {
    entity: 'category',
    id: categoryId,
    nodeId: value,
  };
};

const buildPath = (parentPath: string, name: string): string => {
  const trimmedName = name.trim();
  if (!parentPath) return trimmedName;
  return `${parentPath}/${trimmedName}`;
};

export const buildMasterNodesFromCategoryTree = (
  categories: ProductCategoryWithChildren[]
): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];

  const walk = (
    category: ProductCategoryWithChildren,
    parentNodeId: string | null,
    parentPath: string,
    siblingIndex: number
  ): void => {
    const nodeId = toCategoryMasterNodeId(category.id);
    const path = buildPath(parentPath, category.name);

    nodes.push({
      id: nodeId,
      type: 'folder',
      kind: 'category',
      parentId: parentNodeId,
      name: category.name,
      path,
      sortOrder: siblingIndex,
      metadata: {
        entity: 'category',
        rawId: category.id,
      },
    });

    category.children.forEach((child: ProductCategoryWithChildren, childIndex: number) => {
      walk(child, nodeId, path, childIndex);
    });
  };

  categories.forEach((category: ProductCategoryWithChildren, index: number) => {
    walk(category, null, '', index);
  });

  return nodes;
};
