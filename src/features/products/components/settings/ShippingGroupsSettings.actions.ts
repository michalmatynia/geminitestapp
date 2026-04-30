import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import {
  useDeleteShippingGroupMutation,
  useSaveShippingGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';
import type { ShippingGroupRuleConflict } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  isShippingGroupNotFoundError,
} from '../../utils/shipping-group-settings-utils';
import {
  buildShippingGroupMutationData,
  createEmptyShippingGroupFormData,
  createShippingGroupFormData,
  getShippingGroupSaveValidationError,
  resolveShippingGroupSaveErrorMessage,
  toOptionalCatalogId,
} from './ShippingGroupsSettings.helpers';
import type { ShippingGroupToast } from './ShippingGroupsSettings.helpers';

type ModalStateArgs = {
  selectedCatalogId: string | null;
  toast: ShippingGroupToast;
};

export const useShippingGroupsModalState = ({
  selectedCatalogId,
  toast,
}: ModalStateArgs) => {
  const [showModal, setShowModal] = useState(false);
  const [editingShippingGroup, setEditingShippingGroup] = useState<ProductShippingGroup | null>(null);
  const [formData, setFormData] = useState<ShippingGroupFormData>(
    createEmptyShippingGroupFormData('')
  );
  const openCreateModal = useCallback((): void => {
    const catalogId = toOptionalCatalogId(selectedCatalogId);
    if (catalogId === undefined) {
      toast('Please select a catalog first.', { variant: 'error' });
      return;
    }
    setEditingShippingGroup(null);
    setFormData(createEmptyShippingGroupFormData(catalogId));
    setShowModal(true);
  }, [selectedCatalogId, toast]);
  const openEditModal = useCallback((shippingGroup: ProductShippingGroup): void => {
    setEditingShippingGroup(shippingGroup);
    setFormData(createShippingGroupFormData(shippingGroup));
    setShowModal(true);
  }, []);
  const closeModal = useCallback((): void => {
    setShowModal(false);
  }, []);

  return {
    showModal,
    setShowModal,
    editingShippingGroup,
    formData,
    setFormData,
    openCreateModal,
    openEditModal,
    closeModal,
  };
};

type SaveActionArgs = {
  formData: ShippingGroupFormData;
  editingShippingGroup: ProductShippingGroup | null;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  onRefresh: () => void;
  toast: ShippingGroupToast;
};

type SaveShippingGroupArgs = {
  conflicts: readonly ShippingGroupRuleConflict[];
  categoryLabelById: Map<string, string>;
  normalizedRuleIds: readonly string[];
};

export const useShippingGroupsSaveAction = ({
  formData,
  editingShippingGroup,
  setShowModal,
  onRefresh,
  toast,
}: SaveActionArgs) => {
  const saveShippingGroupMutation = useSaveShippingGroupMutation();
  const handleSave = useCallback(
    async (args: SaveShippingGroupArgs): Promise<void> => {
      const editingShippingGroupId = editingShippingGroup?.id;
      const validationError = getShippingGroupSaveValidationError({
        formData,
        conflicts: args.conflicts,
        categoryLabelById: args.categoryLabelById,
        editingShippingGroupId,
      });
      if (validationError !== null) {
        toast(validationError, { variant: 'error' });
        return;
      }

      try {
        await saveShippingGroupMutation.mutateAsync({
          id: editingShippingGroupId,
          data: buildShippingGroupMutationData({
            formData,
            normalizedRuleIds: args.normalizedRuleIds,
          }),
        });
        toast(editingShippingGroupId === undefined ? 'Shipping group created.' : 'Shipping group updated.', {
          variant: 'success',
        });
        setShowModal(false);
        onRefresh();
      } catch (error) {
        logClientCatch(error, {
          source: 'ShippingGroupsSettings',
          action: 'saveShippingGroup',
          shippingGroupId: editingShippingGroupId,
        });
        toast(
          resolveShippingGroupSaveErrorMessage({
            error,
            categoryLabelById: args.categoryLabelById,
            editingShippingGroupId,
          }),
          { variant: 'error' }
        );
      }
    },
    [editingShippingGroup?.id, formData, onRefresh, saveShippingGroupMutation, setShowModal, toast]
  );

  return {
    handleSave,
    isSaving: saveShippingGroupMutation.isPending,
  };
};

type DeleteActionArgs = {
  selectedCatalogId: string | null;
  onRefresh: () => void;
  toast: ShippingGroupToast;
};

export const useShippingGroupsDeleteAction = ({
  selectedCatalogId,
  onRefresh,
  toast,
}: DeleteActionArgs) => {
  const [shippingGroupToDelete, setShippingGroupToDelete] =
    useState<ProductShippingGroup | null>(null);
  const deleteShippingGroupMutation = useDeleteShippingGroupMutation();
  const handleDelete = useCallback((shippingGroup: ProductShippingGroup): void => {
    setShippingGroupToDelete(shippingGroup);
  }, []);
  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    const target = shippingGroupToDelete;
    if (target === null) return;

    try {
      await deleteShippingGroupMutation.mutateAsync({
        id: target.id,
        catalogId: selectedCatalogId,
      });
      toast('Shipping group deleted.', { variant: 'success' });
      onRefresh();
    } catch (error) {
      logClientCatch(error, {
        source: 'ShippingGroupsSettings',
        action: 'deleteShippingGroup',
        shippingGroupId: target.id,
      });
      if (isShippingGroupNotFoundError(error)) {
        toast('Shipping group was already removed.', { variant: 'success' });
        onRefresh();
        return;
      }
      const message = error instanceof Error ? error.message : 'Failed to delete shipping group.';
      toast(message, { variant: 'error' });
    } finally {
      setShippingGroupToDelete(null);
    }
  }, [deleteShippingGroupMutation, onRefresh, selectedCatalogId, shippingGroupToDelete, toast]);

  return {
    shippingGroupToDelete,
    setShippingGroupToDelete,
    handleDelete,
    handleConfirmDelete,
  };
};
