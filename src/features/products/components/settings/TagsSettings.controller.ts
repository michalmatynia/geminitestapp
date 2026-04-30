'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  useDeleteTagMutation,
  useSaveTagMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { ProductTag } from '@/shared/contracts/products/tags';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { useProductSettingsTagsContext } from './ProductSettingsContext';

export type TagFormData = {
  name: string;
  color: string;
  catalogId: string;
};

export type TagsSettingsController = {
  loading: boolean;
  tags: ProductTag[];
  catalogs: Catalog[];
  catalogOptions: Array<LabeledOptionDto<string>>;
  selectedCatalogId: string | null;
  selectedCatalogName: string;
  hasSelectedCatalog: boolean;
  showNoCatalogsEmptyState: boolean;
  onCatalogChange: (value: string) => void;
  showModal: boolean;
  editingTag: ProductTag | null;
  formData: TagFormData;
  setFormData: React.Dispatch<React.SetStateAction<TagFormData>>;
  tagToDelete: ProductTag | null;
  isSaving: boolean;
  openCreateModal: () => void;
  openEditModal: (tag: ProductTag) => void;
  closeModal: () => void;
  handleSave: () => Promise<void>;
  handleDelete: (tag: ProductTag) => void;
  closeDeleteModal: () => void;
  handleConfirmDelete: () => Promise<void>;
};

type ToastFn = ReturnType<typeof useToast>['toast'];

const DEFAULT_TAG_COLOR = '#38bdf8';

const createEmptyTagFormData = (catalogId: string): TagFormData => ({
  name: '',
  color: DEFAULT_TAG_COLOR,
  catalogId,
});

const createEditTagFormData = (tag: ProductTag): TagFormData => ({
  name: tag.name,
  color: tag.color ?? DEFAULT_TAG_COLOR,
  catalogId: tag.catalogId,
});

const getTagFormValidationMessage = (formData: TagFormData): string | null => {
  if (formData.name.trim().length === 0) return 'Tag name is required.';
  if (formData.catalogId.length === 0) return 'Catalog is required.';
  return null;
};

const buildTagPayload = (
  formData: TagFormData
): { name: string; color: string | null; catalogId: string } => {
  const trimmedColor = formData.color.trim();

  return {
    name: formData.name.trim(),
    color: trimmedColor.length > 0 ? trimmedColor : null,
    catalogId: formData.catalogId,
  };
};

const resolveSelectedCatalogId = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const useTagModalState = ({
  selectedCatalogId,
  toast,
}: {
  selectedCatalogId: string | null;
  toast: ToastFn;
}): Pick<
  TagsSettingsController,
  | 'closeModal'
  | 'editingTag'
  | 'formData'
  | 'openCreateModal'
  | 'openEditModal'
  | 'setFormData'
  | 'showModal'
> => {
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<ProductTag | null>(null);
  const [formData, setFormData] = useState<TagFormData>(createEmptyTagFormData(''));

  const openCreateModal = useCallback((): void => {
    if (selectedCatalogId === null) {
      toast('Please select a catalog first.', { variant: 'error' });
      return;
    }
    setEditingTag(null);
    setFormData(createEmptyTagFormData(selectedCatalogId));
    setShowModal(true);
  }, [selectedCatalogId, toast]);

  const openEditModal = useCallback((tag: ProductTag): void => {
    setEditingTag(tag);
    setFormData(createEditTagFormData(tag));
    setShowModal(true);
  }, []);

  const closeModal = useCallback((): void => {
    setShowModal(false);
  }, []);

  return { closeModal, editingTag, formData, openCreateModal, openEditModal, setFormData, showModal };
};

const useSaveTagHandler = ({
  closeModal,
  editingTag,
  formData,
  onRefresh,
  saveTagMutation,
  toast,
}: {
  closeModal: () => void;
  editingTag: ProductTag | null;
  formData: TagFormData;
  onRefresh: () => void;
  saveTagMutation: ReturnType<typeof useSaveTagMutation>;
  toast: ToastFn;
}): (() => Promise<void>) =>
  useCallback(async (): Promise<void> => {
    const validationMessage = getTagFormValidationMessage(formData);
    if (validationMessage !== null) {
      toast(validationMessage, { variant: 'error' });
      return;
    }

    try {
      await saveTagMutation.mutateAsync({
        id: editingTag?.id,
        data: buildTagPayload(formData),
      });
      toast(editingTag !== null ? 'Tag updated.' : 'Tag created.', { variant: 'success' });
      closeModal();
      onRefresh();
    } catch (error) {
      logClientCatch(error, {
        source: 'TagsSettings',
        action: 'saveTag',
        tagId: editingTag?.id,
      });
      const message = error instanceof Error ? error.message : 'Failed to save tag.';
      toast(message, { variant: 'error' });
    }
  }, [closeModal, editingTag, formData, onRefresh, saveTagMutation, toast]);

const useDeleteTagState = (): Pick<
  TagsSettingsController,
  'closeDeleteModal' | 'handleDelete' | 'tagToDelete'
> => {
  const [tagToDelete, setTagToDelete] = useState<ProductTag | null>(null);
  const handleDelete = useCallback((tag: ProductTag): void => {
    setTagToDelete(tag);
  }, []);
  const closeDeleteModal = useCallback((): void => {
    setTagToDelete(null);
  }, []);

  return { closeDeleteModal, handleDelete, tagToDelete };
};

const useConfirmDeleteTagHandler = ({
  closeDeleteModal,
  deleteTagMutation,
  onRefresh,
  selectedCatalogId,
  tagToDelete,
  toast,
}: {
  closeDeleteModal: () => void;
  deleteTagMutation: ReturnType<typeof useDeleteTagMutation>;
  onRefresh: () => void;
  selectedCatalogId: string | null;
  tagToDelete: ProductTag | null;
  toast: ToastFn;
}): (() => Promise<void>) =>
  useCallback(async (): Promise<void> => {
    if (tagToDelete === null) return;
    const catalogId = selectedCatalogId ?? tagToDelete.catalogId;

    try {
      await deleteTagMutation.mutateAsync({ id: tagToDelete.id, catalogId });
      toast('Tag deleted.', { variant: 'success' });
      onRefresh();
    } catch (error) {
      logClientCatch(error, {
        source: 'TagsSettings',
        action: 'deleteTag',
        tagId: tagToDelete.id,
      });
      const message = error instanceof Error ? error.message : 'Failed to delete tag.';
      toast(message, { variant: 'error' });
    } finally {
      closeDeleteModal();
    }
  }, [closeDeleteModal, deleteTagMutation, onRefresh, selectedCatalogId, tagToDelete, toast]);

export const useTagsSettingsController = (): TagsSettingsController => {
  const settings = useProductSettingsTagsContext();
  const { toast } = useToast();
  const selectedCatalogId = resolveSelectedCatalogId(settings.selectedTagCatalogId);
  const saveTagMutation = useSaveTagMutation();
  const deleteTagMutation = useDeleteTagMutation();
  const modalState = useTagModalState({ selectedCatalogId, toast });
  const deleteState = useDeleteTagState();

  const selectedCatalog = useMemo(
    () => settings.catalogs.find((catalog: Catalog) => catalog.id === selectedCatalogId) ?? null,
    [selectedCatalogId, settings.catalogs]
  );
  const catalogOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      settings.catalogs.map((catalog: Catalog) => ({
        value: catalog.id,
        label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`,
      })),
    [settings.catalogs]
  );
  const handleSave = useSaveTagHandler({
    closeModal: modalState.closeModal,
    editingTag: modalState.editingTag,
    formData: modalState.formData,
    onRefresh: settings.onRefreshTags,
    saveTagMutation,
    toast,
  });
  const handleConfirmDelete = useConfirmDeleteTagHandler({
    closeDeleteModal: deleteState.closeDeleteModal,
    deleteTagMutation,
    onRefresh: settings.onRefreshTags,
    selectedCatalogId,
    tagToDelete: deleteState.tagToDelete,
    toast,
  });

  return {
    loading: settings.loadingTags,
    tags: settings.tags,
    catalogs: settings.catalogs,
    catalogOptions,
    selectedCatalogId,
    selectedCatalogName: selectedCatalog?.name ?? '',
    hasSelectedCatalog: selectedCatalogId !== null,
    showNoCatalogsEmptyState: selectedCatalogId === null && settings.catalogs.length === 0,
    onCatalogChange: settings.onTagCatalogChange,
    isSaving: saveTagMutation.isPending,
    handleSave,
    handleConfirmDelete,
    ...modalState,
    ...deleteState,
  };
};
