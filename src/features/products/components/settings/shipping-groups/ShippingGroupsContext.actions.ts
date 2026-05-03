'use client';

import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';

import type {
  ShippingGroupsActions,
  ShippingGroupsLocalState,
  ShippingGroupsModalDerivedState,
  ShippingGroupsMutations,
  ShippingGroupsQueryState,
  ShippingGroupsSelectedState,
  ShippingGroupsSettingsState,
} from './ShippingGroupsContext.controller-types';
import {
  createEditShippingGroupFormData,
  createEmptyShippingGroupFormData,
} from './ShippingGroupsContext.form';
import { useShippingGroupHandlers } from './ShippingGroupsContext.handlers';

export const openCreateModal = (
  selectedCatalogId: string | null,
  local: ShippingGroupsLocalState
): void => {
  if (selectedCatalogId === null) {
    local.toast('Please select a catalog first.', { variant: 'error' });
    return;
  }
  local.setEditingShippingGroup(null);
  local.setFormData(createEmptyShippingGroupFormData(selectedCatalogId));
  local.setShowModal(true);
};

export const openEditModal = (
  shippingGroup: ProductShippingGroup,
  local: ShippingGroupsLocalState
): void => {
  local.setEditingShippingGroup(shippingGroup);
  local.setFormData(createEditShippingGroupFormData(shippingGroup));
  local.setShowModal(true);
};

export const useShippingGroupsActions = ({
  local,
  modal,
  queries,
  selected,
  settings,
  mutations,
}: {
  local: ShippingGroupsLocalState;
  modal: ShippingGroupsModalDerivedState;
  queries: ShippingGroupsQueryState;
  selected: ShippingGroupsSelectedState;
  settings: ShippingGroupsSettingsState;
  mutations: ShippingGroupsMutations;
}): ShippingGroupsActions => {
  const handlers = useShippingGroupHandlers({
    formData: local.formData,
    editingShippingGroup: local.editingShippingGroup,
    modalShippingGroupRuleConflicts: modal.modalShippingGroupRuleConflicts,
    modalCategoryLabelById: modal.modalCategoryLabelById,
    saveShippingGroupMutation: mutations.saveShippingGroupMutation,
    deleteShippingGroupMutation: mutations.deleteShippingGroupMutation,
    normalizedModalRuleIds: modal.normalizedModalRuleIds,
    normalizedModalCurrencyCodes: modal.normalizedModalCurrencyCodes,
    setShowModal: local.setShowModal,
    onRefresh: settings.onRefresh,
    toast: local.toast,
    shippingGroupToDelete: local.shippingGroupToDelete,
    setShippingGroupToDelete: local.setShippingGroupToDelete,
    selectedCatalogId: settings.selectedCatalogId,
    selectedCatalogCategories: queries.selectedCatalogCategories,
    shippingGroups: settings.shippingGroups,
    selectedCatalogCurrencyCodes: selected.selectedCatalogCurrencyCodes,
    selectedCategoryLabelById: selected.selectedCategoryLabelById,
  });
  return {
    ...handlers,
    openCreateModal: (): void => openCreateModal(settings.selectedCatalogId, local),
    openEditModal: (shippingGroup: ProductShippingGroup): void =>
      openEditModal(shippingGroup, local),
  };
};
