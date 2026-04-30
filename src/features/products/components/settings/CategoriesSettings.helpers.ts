import type { ReorderCategoryPayload } from '@/features/products/api/settings';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type {
  ProductCategory,
  ProductCategoryWithChildren,
} from '@/shared/contracts/products/categories';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { CategoryFormData, CategoryParentOption } from './CategoryFormContext';

const CATEGORY_DEFAULT_COLOR = '#10b981';

export type CategorySaveValidation =
  | { ok: true; catalogId: string }
  | { ok: false; message: string };

export const cloneCategoryTree = (
  nodes: ProductCategoryWithChildren[]
): ProductCategoryWithChildren[] =>
  nodes.map(
    (node: ProductCategoryWithChildren): ProductCategoryWithChildren => ({
      ...node,
      children: cloneCategoryTree(node.children),
    })
  );

export const createEmptyCategoryFormData = (
  catalogId: string,
  parentId: string | null
): CategoryFormData => ({
  name: '',
  namePl: '',
  description: '',
  color: CATEGORY_DEFAULT_COLOR,
  parentId,
  catalogId,
});

export const createEditCategoryFormData = (
  category: ProductCategoryWithChildren
): CategoryFormData => ({
  name: category.name_en ?? category.name,
  namePl: category.name_pl ?? '',
  description: category.description ?? '',
  color: category.color ?? CATEGORY_DEFAULT_COLOR,
  parentId: category.parentId ?? null,
  catalogId: category.catalogId,
});

const normalizeNullableText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveTargetCatalogId = ({
  editingCategory,
  formData,
  selectedCatalogId,
}: {
  editingCategory: ProductCategoryWithChildren | null;
  formData: CategoryFormData;
  selectedCatalogId: string | null;
}): string | null => {
  const formCatalogId = formData.catalogId.trim();
  if (formCatalogId.length > 0) return formCatalogId;
  if (selectedCatalogId !== null && selectedCatalogId.length > 0) return selectedCatalogId;
  return editingCategory?.catalogId ?? null;
};

export const validateCategorySaveInput = (input: {
  editingCategory: ProductCategoryWithChildren | null;
  formData: CategoryFormData;
  selectedCatalogId: string | null;
}): CategorySaveValidation => {
  if (input.formData.name.trim().length === 0) {
    return { ok: false, message: 'Category name is required' };
  }
  const catalogId = resolveTargetCatalogId(input);
  if (catalogId === null) {
    return { ok: false, message: 'Please select a catalog first' };
  }
  return { ok: true, catalogId };
};

export const buildCategorySavePayload = (
  formData: CategoryFormData,
  catalogId: string
): Partial<ProductCategory> => ({
  name: formData.name.trim(),
  name_pl: normalizeNullableText(formData.namePl),
  description: normalizeNullableText(formData.description),
  color: formData.color,
  parentId: formData.parentId ?? null,
  catalogId,
});

export const createCatalogOptions = (catalogs: Catalog[]): Array<LabeledOptionDto<string>> =>
  catalogs.map((catalog: Catalog) => ({
    value: catalog.id,
    label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`,
  }));

export const findCategoryById = (
  categories: ProductCategoryWithChildren[],
  id: string
): ProductCategoryWithChildren | null => {
  for (const category of categories) {
    if (category.id === id) return category;
    const found = findCategoryById(category.children, id);
    if (found !== null) return found;
  }
  return null;
};

export const collectDescendantIds = (category: ProductCategoryWithChildren): string[] =>
  category.children.flatMap((child: ProductCategoryWithChildren): string[] => [
    child.id,
    ...collectDescendantIds(child),
  ]);

export const flattenCategoryOptions = (
  categories: ProductCategoryWithChildren[],
  level: number = 0
): CategoryParentOption[] =>
  categories.flatMap((category: ProductCategoryWithChildren): CategoryParentOption[] => [
    { id: category.id, name: category.name, level },
    ...flattenCategoryOptions(category.children, level + 1),
  ]);

export const createExcludedParentIds = ({
  editingCategory,
  modalCatalogId,
  modalCategories,
}: {
  editingCategory: ProductCategoryWithChildren | null;
  modalCatalogId: string | null;
  modalCategories: ProductCategoryWithChildren[];
}): Set<string> => {
  if (editingCategory === null) return new Set<string>();
  if (modalCatalogId !== null && editingCategory.catalogId !== modalCatalogId) {
    return new Set<string>();
  }
  const current = findCategoryById(modalCategories, editingCategory.id);
  if (current === null) return new Set<string>();
  return new Set([editingCategory.id, ...collectDescendantIds(current)]);
};

export const buildCategoryById = (
  categories: ProductCategoryWithChildren[]
): Map<string, ProductCategoryWithChildren> => {
  const map = new Map<string, ProductCategoryWithChildren>();
  const walk = (nodes: ProductCategoryWithChildren[]): void => {
    nodes.forEach((node: ProductCategoryWithChildren): void => {
      map.set(node.id, node);
      if (node.children.length > 0) walk(node.children);
    });
  };
  walk(categories);
  return map;
};

export const buildMasterRevision = (nodes: MasterTreeNode[]): string =>
  nodes
    .map((node: MasterTreeNode): string => `${node.id}:${node.parentId ?? 'root'}:${node.sortOrder}`)
    .join('|');

export const getDeleteCategoryMessage = (
  category: ProductCategoryWithChildren | null
): string => {
  if (category === null) return 'Are you sure you want to delete this category?';
  if (category.children.length > 0) {
    return `Are you sure you want to delete category "${category.name}" and ALL its subcategories? This cannot be undone.`;
  }
  return `Are you sure you want to delete category "${category.name}"? This cannot be undone.`;
};

export const getCategoryMutationSuccessMessage = (
  editingCategory: ProductCategoryWithChildren | null
): string =>
  editingCategory !== null ? 'Category updated successfully' : 'Category created successfully';

export const createReorderToastContext = (payload: ReorderCategoryPayload): {
  action: string;
  payload: ReorderCategoryPayload;
  source: string;
} => ({
  source: 'CategoriesSettings',
  action: 'applyCategoryReorderPayload',
  payload,
});
