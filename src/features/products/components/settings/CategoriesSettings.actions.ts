'use client';

import { useCallback } from 'react';

import {
  useDeleteCategoryMutation,
  useSaveCategoryMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { CategoryFormData } from './CategoryFormContext';
import {
  buildCategorySavePayload,
  createEditCategoryFormData,
  createEmptyCategoryFormData,
  getCategoryMutationSuccessMessage,
  validateCategorySaveInput,
} from './CategoriesSettings.helpers';

type ToastFn = (message: string, options?: { variant?: 'success' | 'error' | 'info' }) => void;

type CategoriesSettingsActionsInput = {
  categoryToDelete: ProductCategoryWithChildren | null;
  editingCategory: ProductCategoryWithChildren | null;
  formData: CategoryFormData;
  onRefresh: () => void;
  selectedCatalogId: string | null;
  setCategoryToDelete: React.Dispatch<React.SetStateAction<ProductCategoryWithChildren | null>>;
  setEditingCategory: React.Dispatch<React.SetStateAction<ProductCategoryWithChildren | null>>;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  setModalCatalogId: React.Dispatch<React.SetStateAction<string | null>>;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  toast: ToastFn;
};

export type CategoriesSettingsActions = {
  closeModal: () => void;
  deleteCategoryPending: boolean;
  handleConfirmDelete: () => Promise<void>;
  handleDelete: (category: ProductCategoryWithChildren) => void;
  handleOpenCreateModal: (parentId?: string | null) => void;
  handleOpenEditModal: (category: ProductCategoryWithChildren) => void;
  handleSave: () => Promise<void>;
  saveCategoryPending: boolean;
};

const useCategoryModalActions = ({
  selectedCatalogId,
  setCategoryToDelete,
  setEditingCategory,
  setFormData,
  setModalCatalogId,
  setShowModal,
  toast,
}: CategoriesSettingsActionsInput): Pick<
  CategoriesSettingsActions,
  'closeModal' | 'handleDelete' | 'handleOpenCreateModal' | 'handleOpenEditModal'
> => {
  const handleOpenCreateModal = useCallback((parentId: string | null = null): void => {
    if (selectedCatalogId === null || selectedCatalogId.length === 0) {
      toast('Please select a catalog first', { variant: 'error' });
      return;
    }
    setEditingCategory(null);
    setFormData(createEmptyCategoryFormData(selectedCatalogId, parentId));
    setModalCatalogId(selectedCatalogId);
    setShowModal(true);
  }, [selectedCatalogId, setEditingCategory, setFormData, setModalCatalogId, setShowModal, toast]);
  const handleOpenEditModal = useCallback((category: ProductCategoryWithChildren): void => {
    setEditingCategory(category);
    setFormData(createEditCategoryFormData(category));
    setModalCatalogId(category.catalogId);
    setShowModal(true);
  }, [setEditingCategory, setFormData, setModalCatalogId, setShowModal]);
  const handleDelete = useCallback(
    (category: ProductCategoryWithChildren): void => setCategoryToDelete(category),
    [setCategoryToDelete]
  );
  const closeModal = useCallback((): void => setShowModal(false), [setShowModal]);
  return { closeModal, handleDelete, handleOpenCreateModal, handleOpenEditModal };
};

const useCategoryDeleteAction = ({
  categoryToDelete,
  onRefresh,
  selectedCatalogId,
  setCategoryToDelete,
  toast,
}: CategoriesSettingsActionsInput): (() => Promise<void>) => {
  const deleteCategoryMutation = useDeleteCategoryMutation();
  return useCallback(async (): Promise<void> => {
    if (categoryToDelete === null) return;
    try {
      await deleteCategoryMutation.mutateAsync({ id: categoryToDelete.id, catalogId: selectedCatalogId });
      toast('Category deleted successfully', { variant: 'success' });
      onRefresh();
    } catch (error: unknown) {
      logClientCatch(error, { source: 'CategoriesSettings', action: 'deleteCategory',
        categoryId: categoryToDelete.id });
      toast(error instanceof Error ? error.message : 'Failed to delete category', { variant: 'error' });
    } finally {
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, deleteCategoryMutation, onRefresh, selectedCatalogId, setCategoryToDelete, toast]);
};

const useCategorySaveAction = ({
  editingCategory,
  formData,
  onRefresh,
  selectedCatalogId,
  setShowModal,
  toast,
}: CategoriesSettingsActionsInput): {
  handleSave: () => Promise<void>;
  saveCategoryPending: boolean;
} => {
  const saveCategoryMutation = useSaveCategoryMutation();
  const handleSave = useCallback(async (): Promise<void> => {
    const validation = validateCategorySaveInput({ editingCategory, formData, selectedCatalogId });
    if (!validation.ok) { toast(validation.message, { variant: 'error' }); return; }
    try {
      await saveCategoryMutation.mutateAsync({
        id: editingCategory?.id,
        data: buildCategorySavePayload(formData, validation.catalogId),
      });
      toast(getCategoryMutationSuccessMessage(editingCategory), { variant: 'success' });
      setShowModal(false);
      onRefresh();
    } catch (error: unknown) {
      logClientCatch(error, { source: 'CategoriesSettings', action: 'saveCategory',
        categoryId: editingCategory?.id });
      toast(error instanceof Error ? error.message : 'Failed to save category', { variant: 'error' });
    }
  }, [editingCategory, formData, onRefresh, saveCategoryMutation, selectedCatalogId, setShowModal, toast]);
  return { handleSave, saveCategoryPending: saveCategoryMutation.isPending };
};

export const useCategoriesSettingsActions = (
  input: CategoriesSettingsActionsInput
): CategoriesSettingsActions => {
  const modalActions = useCategoryModalActions(input);
  const handleConfirmDelete = useCategoryDeleteAction(input);
  const { handleSave, saveCategoryPending } = useCategorySaveAction(input);
  return { ...modalActions, deleteCategoryPending: false, handleConfirmDelete, handleSave,
    saveCategoryPending };
};
