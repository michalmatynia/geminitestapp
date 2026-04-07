'use client';

import { useCallback } from 'react';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  formatShippingGroupConflictMessage,
  readConflictMetaFromApiError,
} from './shipping-group-utils';
import {
  normalizeShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCurrencyCodes,
  buildShippingGroupRuleConflicts,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import type { useToast } from '@/shared/ui/toast';
import type {
  useDeleteShippingGroupMutation,
  useSaveShippingGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { ShippingGroupFormData } from './ShippingGroupsContext';

type ShippingGroupToast = ReturnType<typeof useToast>['toast'];
type ShippingGroupSaveMutation = ReturnType<typeof useSaveShippingGroupMutation>;
type ShippingGroupDeleteMutation = ReturnType<typeof useDeleteShippingGroupMutation>;

export const useShippingGroupHandlers = ({
  formData,
  editingShippingGroup,
  modalShippingGroupRuleConflicts,
  modalCategoryLabelById,
  saveShippingGroupMutation,
  deleteShippingGroupMutation,
  normalizedModalRuleIds,
  normalizedModalCurrencyCodes,
  setShowModal,
  onRefresh,
  toast,
  shippingGroupToDelete,
  setShippingGroupToDelete,
  selectedCatalogId,
  selectedCatalogCategories,
  shippingGroups,
  selectedCatalogCurrencyCodes,
  selectedCategoryLabelById,
}: {
  formData: ShippingGroupFormData;
  editingShippingGroup: ProductShippingGroup | null;
  modalShippingGroupRuleConflicts: any[];
  modalCategoryLabelById: Map<string, string>;
  saveShippingGroupMutation: ShippingGroupSaveMutation;
  deleteShippingGroupMutation: ShippingGroupDeleteMutation;
  normalizedModalRuleIds: string[];
  normalizedModalCurrencyCodes: string[];
  setShowModal: (show: boolean) => void;
  onRefresh: () => void;
  toast: ShippingGroupToast;
  shippingGroupToDelete: ProductShippingGroup | null;
  setShippingGroupToDelete: (group: ProductShippingGroup | null) => void;
  selectedCatalogId: string | null;
  selectedCatalogCategories: ProductCategory[];
  shippingGroups: ProductShippingGroup[];
  selectedCatalogCurrencyCodes: string[];
  selectedCategoryLabelById: Map<string, string>;
}) => {
  const handleSave = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast('Shipping group name is required.', { variant: 'error' });
      return;
    }
    if (!formData.catalogId) {
      toast('Catalog is required.', { variant: 'error' });
      return;
    }
    const trimmedShippingPrice = formData.traderaShippingPriceEur.trim();
    if (trimmedShippingPrice) {
      const parsedShippingPrice = Number(trimmedShippingPrice);
      if (!Number.isFinite(parsedShippingPrice) || parsedShippingPrice < 0) {
        toast('Tradera shipping price must be a non-negative EUR amount.', {
          variant: 'error',
        });
        return;
      }
    }
    if (modalShippingGroupRuleConflicts.length > 0) {
      toast(
        formatShippingGroupConflictMessage({
          conflicts: modalShippingGroupRuleConflicts,
          categoryLabelById: modalCategoryLabelById,
          draftShippingGroupId: editingShippingGroup?.id ?? '__draft-shipping-group__',
        }),
        { variant: 'error' }
      );
      return;
    }

    try {
      await saveShippingGroupMutation.mutateAsync({
        id: editingShippingGroup?.id,
        data: {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          catalogId: formData.catalogId,
          traderaShippingCondition: formData.traderaShippingCondition.trim() || null,
          traderaShippingPriceEur: trimmedShippingPrice ? Number(trimmedShippingPrice) : null,
          autoAssignCategoryIds: normalizedModalRuleIds,
          autoAssignCurrencyCodes: normalizedModalCurrencyCodes,
        },
      });

      toast(editingShippingGroup ? 'Shipping group updated.' : 'Shipping group created.', {
        variant: 'success',
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      logClientCatch(error, {
        source: 'ShippingGroupsSettings',
        action: 'saveShippingGroup',
        shippingGroupId: editingShippingGroup?.id,
      });
      const conflictMeta = readConflictMetaFromApiError(error);
      const message =
        conflictMeta.length > 0
          ? formatShippingGroupConflictMessage({
              conflicts: conflictMeta,
              categoryLabelById: modalCategoryLabelById,
              draftShippingGroupId: editingShippingGroup?.id ?? '__draft-shipping-group__',
            })
          : error instanceof Error
            ? error.message
            : 'Failed to save shipping group.';
      toast(message, { variant: 'error' });
    }
  };

  const handleDelete = useCallback((shippingGroup: ProductShippingGroup): void => {
    setShippingGroupToDelete(shippingGroup);
  }, [setShippingGroupToDelete]);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!shippingGroupToDelete) return;

    try {
      await deleteShippingGroupMutation.mutateAsync({
        id: shippingGroupToDelete.id,
        catalogId: selectedCatalogId,
      });
      toast('Shipping group deleted.', { variant: 'success' });
      onRefresh();
    } catch (error) {
      logClientCatch(error, {
        source: 'ShippingGroupsSettings',
        action: 'deleteShippingGroup',
        shippingGroupId: shippingGroupToDelete.id,
      });
      const message = error instanceof Error ? error.message : 'Failed to delete shipping group.';
      toast(message, { variant: 'error' });
    } finally {
      setShippingGroupToDelete(null);
    }
  };

  const handleRepairRule = useCallback(
    async (shippingGroup: ProductShippingGroup): Promise<void> => {
      const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
        categoryIds: shippingGroup.autoAssignCategoryIds ?? [],
        categories: selectedCatalogCategories,
      });
      const repairedShippingGroups = shippingGroups.map((group) =>
        group.id === shippingGroup.id
          ? {
              ...group,
              autoAssignCategoryIds: normalizedRuleIds,
            }
          : group
      );
      const repairConflicts = buildShippingGroupRuleConflicts({
        shippingGroups: repairedShippingGroups,
        categories: selectedCatalogCategories,
        availableCurrencyCodes: selectedCatalogCurrencyCodes,
      }).filter((conflict) => conflict.groupIds.includes(shippingGroup.id));

      if (repairConflicts.length > 0) {
        toast(
          formatShippingGroupConflictMessage({
            conflicts: repairConflicts,
            categoryLabelById: selectedCategoryLabelById,
            draftShippingGroupId: shippingGroup.id,
          }),
          { variant: 'error' }
        );
        return;
      }

      try {
        await saveShippingGroupMutation.mutateAsync({
          id: shippingGroup.id,
          data: {
            name: shippingGroup.name,
            description: shippingGroup.description ?? null,
            catalogId: shippingGroup.catalogId,
            traderaShippingCondition: shippingGroup.traderaShippingCondition ?? null,
            traderaShippingPriceEur:
              typeof shippingGroup.traderaShippingPriceEur === 'number' &&
              Number.isFinite(shippingGroup.traderaShippingPriceEur)
                ? shippingGroup.traderaShippingPriceEur
                : null,
            autoAssignCategoryIds: normalizedRuleIds,
            autoAssignCurrencyCodes: normalizeShippingGroupRuleCurrencyCodes({
              currencyCodes: shippingGroup.autoAssignCurrencyCodes ?? [],
              availableCurrencyCodes: selectedCatalogCurrencyCodes,
            }),
          },
        });

        toast(
          normalizedRuleIds.length > 0
            ? `Repaired auto-assign rule for ${shippingGroup.name}.`
            : `Removed invalid auto-assign rule for ${shippingGroup.name}.`,
          { variant: 'success' }
        );
        onRefresh();
      } catch (error) {
        logClientCatch(error, {
          source: 'ShippingGroupsSettings',
          action: 'repairShippingGroupRule',
          shippingGroupId: shippingGroup.id,
        });
        const conflictMeta = readConflictMetaFromApiError(error);
        const message =
          conflictMeta.length > 0
            ? formatShippingGroupConflictMessage({
                conflicts: conflictMeta,
                categoryLabelById: selectedCategoryLabelById,
                draftShippingGroupId: shippingGroup.id,
              })
            : error instanceof Error
              ? error.message
              : 'Failed to repair shipping group rule.';
        toast(message, { variant: 'error' });
      }
    },
    [
      onRefresh,
      saveShippingGroupMutation,
      selectedCatalogCategories,
      selectedCatalogCurrencyCodes,
      selectedCategoryLabelById,
      shippingGroups,
      toast,
    ]
  );

  return {
    handleSave,
    handleDelete,
    handleConfirmDelete,
    handleRepairRule,
  };
};
