'use client';

import { useEffect, useMemo, useState } from 'react';

import { useProductCategoryTree } from '@/features/products/hooks/useCategoryQueries';
import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { buildMasterNodesFromCategoryTree } from './category-master-tree';
import type { CategoryFormData, CategoryParentOption } from './CategoryFormContext';
import {
  buildCategoryById,
  buildMasterRevision,
  cloneCategoryTree,
  createExcludedParentIds,
  flattenCategoryOptions,
} from './CategoriesSettings.helpers';

export type CategoriesSettingsDerivedData = {
  categoryById: Map<string, ProductCategoryWithChildren>;
  masterNodes: MasterTreeNode[];
  masterRevision: string;
  modalCategories: ProductCategoryWithChildren[];
  modalLoadingCategories: boolean;
  parentOptions: CategoryParentOption[];
  setTreeData: React.Dispatch<React.SetStateAction<ProductCategoryWithChildren[]>>;
  treeData: ProductCategoryWithChildren[];
};

const useSyncedCategoryTree = (
  categories: ProductCategoryWithChildren[]
): [
  ProductCategoryWithChildren[],
  React.Dispatch<React.SetStateAction<ProductCategoryWithChildren[]>>,
] => {
  const [treeData, setTreeData] = useState<ProductCategoryWithChildren[]>(() =>
    cloneCategoryTree(categories)
  );
  useEffect((): void => {
    setTreeData(cloneCategoryTree(categories));
  }, [categories]);
  return [treeData, setTreeData];
};

const useModalCategories = ({
  modalCatalogId,
  selectedCatalogId,
  treeData,
}: {
  modalCatalogId: string | null;
  selectedCatalogId: string | null;
  treeData: ProductCategoryWithChildren[];
}): {
  modalCategories: ProductCategoryWithChildren[];
  modalLoadingCategories: boolean;
} => {
  const { data: fetchedModalCategories, isLoading } = useProductCategoryTree(
    modalCatalogId ?? undefined
  );
  const modalCategories = useMemo((): ProductCategoryWithChildren[] => {
    if (modalCatalogId === selectedCatalogId) return treeData;
    return fetchedModalCategories ?? [];
  }, [fetchedModalCategories, modalCatalogId, selectedCatalogId, treeData]);
  return { modalCategories, modalLoadingCategories: isLoading };
};

const useParentOptions = ({
  editingCategory,
  formData,
  modalCatalogId,
  modalCategories,
  setFormData,
  showModal,
}: {
  editingCategory: ProductCategoryWithChildren | null;
  formData: CategoryFormData;
  modalCatalogId: string | null;
  modalCategories: ProductCategoryWithChildren[];
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  showModal: boolean;
}): CategoryParentOption[] => {
  const categoryOptions = useMemo(
    (): CategoryParentOption[] => flattenCategoryOptions(modalCategories),
    [modalCategories]
  );
  const excludedParentIds = useMemo(
    (): Set<string> => createExcludedParentIds({ editingCategory, modalCatalogId, modalCategories }),
    [editingCategory, modalCatalogId, modalCategories]
  );
  const parentOptions = useMemo(
    (): CategoryParentOption[] =>
      categoryOptions.filter((option: CategoryParentOption): boolean => !excludedParentIds.has(option.id)),
    [categoryOptions, excludedParentIds]
  );
  useEffect((): void => {
    if (!showModal) return;
    if (formData.parentId === null || formData.parentId.length === 0) return;
    const stillValid = parentOptions.some(
      (option: CategoryParentOption): boolean => option.id === formData.parentId
    );
    if (!stillValid) setFormData((prev: CategoryFormData) => ({ ...prev, parentId: null }));
  }, [formData.parentId, parentOptions, setFormData, showModal]);
  return parentOptions;
};

export const useCategoriesSettingsDerivedData = ({
  categories,
  editingCategory,
  formData,
  modalCatalogId,
  selectedCatalogId,
  setFormData,
  showModal,
}: {
  categories: ProductCategoryWithChildren[];
  editingCategory: ProductCategoryWithChildren | null;
  formData: CategoryFormData;
  modalCatalogId: string | null;
  selectedCatalogId: string | null;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  showModal: boolean;
}): CategoriesSettingsDerivedData => {
  const [treeData, setTreeData] = useSyncedCategoryTree(categories);
  const { modalCategories, modalLoadingCategories } = useModalCategories({
    modalCatalogId,
    selectedCatalogId,
    treeData,
  });
  const masterNodes = useMemo((): MasterTreeNode[] => buildMasterNodesFromCategoryTree(treeData), [treeData]);
  const masterRevision = useMemo((): string => buildMasterRevision(masterNodes), [masterNodes]);
  const categoryById = useMemo(() => buildCategoryById(treeData), [treeData]);
  const parentOptions = useParentOptions({
    editingCategory, formData, modalCatalogId, modalCategories, setFormData, showModal,
  });
  return { categoryById, masterNodes, masterRevision, modalCategories, modalLoadingCategories,
    parentOptions, setTreeData, treeData };
};
