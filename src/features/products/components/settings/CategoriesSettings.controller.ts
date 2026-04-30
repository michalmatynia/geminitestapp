'use client';

import { useMemo, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import { useToast } from '@/shared/ui/toast';

import type { CategoryFormData } from './CategoryFormContext';
import { createCatalogOptions, createEmptyCategoryFormData } from './CategoriesSettings.helpers';
import { type CategoriesSettingsActions, useCategoriesSettingsActions } from './CategoriesSettings.actions';
import { type CategoriesSettingsDerivedData, useCategoriesSettingsDerivedData } from './CategoriesSettings.derived';
import { type CategoriesTreeShell, useCategoriesTreeShell } from './CategoriesSettings.tree-shell';
import { useProductSettingsCategoriesContext } from './ProductSettingsContext';

type ProductSettingsCategoriesContext = ReturnType<typeof useProductSettingsCategoriesContext>;

export type CategoriesSettingsController = {
  actions: CategoriesSettingsActions;
  catalogOptions: Array<LabeledOptionDto<string>>;
  categoryToDelete: ProductCategoryWithChildren | null;
  context: ProductSettingsCategoriesContext;
  derived: CategoriesSettingsDerivedData;
  editingCategory: ProductCategoryWithChildren | null;
  formData: CategoryFormData;
  modalCatalog: Catalog | undefined;
  modalCatalogId: string | null;
  selectedCatalog: Catalog | undefined;
  setCategoryToDelete: React.Dispatch<React.SetStateAction<ProductCategoryWithChildren | null>>;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  setModalCatalogId: React.Dispatch<React.SetStateAction<string | null>>;
  showModal: boolean;
  treeShell: CategoriesTreeShell;
};

export const useCategoriesSettingsController = (): CategoriesSettingsController => {
  const context = useProductSettingsCategoriesContext();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategoryWithChildren | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(createEmptyCategoryFormData('', null));
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategoryWithChildren | null>(null);
  const [modalCatalogId, setModalCatalogId] = useState<string | null>(null);
  const derived = useCategoriesSettingsDerivedData({
    categories: context.categories,
    editingCategory,
    formData,
    modalCatalogId,
    selectedCatalogId: context.selectedCategoryCatalogId,
    setFormData,
    showModal,
  });
  const actions = useCategoriesSettingsActions({
    categoryToDelete, editingCategory, formData, onRefresh: context.onRefreshCategories,
    selectedCatalogId: context.selectedCategoryCatalogId, setCategoryToDelete, setEditingCategory,
    setFormData, setModalCatalogId, setShowModal, toast,
  });
  const treeShell = useCategoriesTreeShell({
    categoryById: derived.categoryById,
    handleDelete: actions.handleDelete,
    handleOpenCreateModal: actions.handleOpenCreateModal,
    handleOpenEditModal: actions.handleOpenEditModal,
    masterNodes: derived.masterNodes,
    masterRevision: derived.masterRevision,
    onRefresh: context.onRefreshCategories,
    selectedCatalogId: context.selectedCategoryCatalogId,
    toast,
  });
  const selectedCatalog = context.catalogs.find(
    (catalog): boolean => catalog.id === context.selectedCategoryCatalogId
  );
  const modalCatalog = context.catalogs.find((catalog): boolean => catalog.id === modalCatalogId);
  const catalogOptions = useMemo(() => createCatalogOptions(context.catalogs), [context.catalogs]);

  return { actions, catalogOptions, categoryToDelete, context, derived, editingCategory, formData,
    modalCatalog, modalCatalogId, setCategoryToDelete, setFormData, setModalCatalogId,
    selectedCatalog, showModal, treeShell };
};
