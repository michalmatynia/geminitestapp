'use client';

import { useMemo, useState } from 'react';

import {
  useProductSettingsPriceGroupsContext,
  useProductSettingsShippingGroupsContext,
} from '../ProductSettingsContext';
import {
  useCategories as useProductMetadataCategories,
  useShippingGroups as useProductMetadataShippingGroups,
} from '@/features/products/hooks/useProductMetadataQueries';
import {
  useDeleteShippingGroupMutation,
  useSaveShippingGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import { buildCategoryPathLabelMap } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import {
  normalizeShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCurrencyCodes,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { useToast } from '@/shared/ui/toast';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';

import { useShippingGroupsActions } from './ShippingGroupsContext.actions';
import type {
  ShippingGroupsLocalState,
  ShippingGroupsModalDerivedState,
  ShippingGroupsMutations,
  ShippingGroupsQueryState,
  ShippingGroupsSelectedState,
  ShippingGroupsSettingsState,
} from './ShippingGroupsContext.controller-types';
import {
  createEmptyShippingGroupFormData,
} from './ShippingGroupsContext.form';
import {
  useCatalogCurrencyCodes,
  useShippingGroupSummaries,
} from './ShippingGroupsContext.hooks';
import { useModalShippingGroupRuleConflicts } from './ShippingGroupsContext.modal-conflicts';
import { useShippingGroupsRepair } from './ShippingGroupsContext.repair';
import { useShippingGroupsModalState } from './ShippingGroupsContext.state';
import type { ShippingGroupsStateValue } from './ShippingGroupsContext.types';
import { composeShippingGroupsStateValue } from './ShippingGroupsContext.value';

const useShippingGroupsLocalState = (): ShippingGroupsLocalState => {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingShippingGroup, setEditingShippingGroup] = useState<ProductShippingGroup | null>(null);
  const [shippingGroupToDelete, setShippingGroupToDelete] =
    useState<ProductShippingGroup | null>(null);
  const [formData, setFormData] = useState(createEmptyShippingGroupFormData);

  return {
    toast,
    showModal,
    setShowModal,
    editingShippingGroup,
    setEditingShippingGroup,
    shippingGroupToDelete,
    setShippingGroupToDelete,
    formData,
    setFormData,
  };
};

const useShippingGroupsQueryState = ({
  selectedCatalogId,
  formCatalogId,
  showModal,
}: {
    selectedCatalogId: string | null;
    formCatalogId: string;
    showModal: boolean;
}): ShippingGroupsQueryState => {
  const selectedCatalogQuery = useProductMetadataCategories(selectedCatalogId ?? undefined, {
    enabled: selectedCatalogId !== null,
  });
  const modalCategoryQuery = useProductMetadataCategories(
    formCatalogId.length > 0 ? formCatalogId : undefined,
    { enabled: formCatalogId.length > 0 }
  );
  const modalShippingGroupQuery = useProductMetadataShippingGroups(
    formCatalogId.length > 0 ? formCatalogId : undefined,
    { enabled: formCatalogId.length > 0 && showModal }
  );

  return {
    selectedCatalogCategories: selectedCatalogQuery.data ?? [],
    loadingSelectedCatalogCategories: selectedCatalogQuery.isLoading,
    modalCatalogCategories: modalCategoryQuery.data ?? [],
    loadingModalCatalogCategories: modalCategoryQuery.isLoading,
    modalCatalogShippingGroups: modalShippingGroupQuery.data ?? [],
    loadingModalCatalogShippingGroups: modalShippingGroupQuery.isLoading,
  };
};

const useShippingGroupsSettingsState = (): ShippingGroupsSettingsState => {
  const settings = useProductSettingsShippingGroupsContext();
  const { priceGroups } = useProductSettingsPriceGroupsContext();

  return {
    loading: settings.loadingShippingGroups,
    shippingGroups: settings.shippingGroups,
    catalogs: settings.catalogs,
    selectedCatalogId: settings.selectedShippingGroupCatalogId,
    onCatalogChange: settings.onShippingGroupCatalogChange,
    onRefresh: settings.onRefreshShippingGroups,
    priceGroups,
  };
};

const useShippingGroupsSelectedState = ({
  settings,
  queries,
}: {
  settings: ShippingGroupsSettingsState;
  queries: ShippingGroupsQueryState;
}): ShippingGroupsSelectedState => {
  const catalogCurrencyCodesByCatalogId = useCatalogCurrencyCodes(settings.catalogs, settings.priceGroups);
  const selectedCatalogCurrencyCodes = useMemo(
    () =>
      settings.selectedCatalogId !== null
        ? catalogCurrencyCodesByCatalogId.get(settings.selectedCatalogId) ?? []
        : [],
    [catalogCurrencyCodesByCatalogId, settings.selectedCatalogId]
  );
  const selectedCategoryLabelById = useMemo(
    () => buildCategoryPathLabelMap(queries.selectedCatalogCategories),
    [queries.selectedCatalogCategories]
  );
  const summaries = useShippingGroupSummaries({
    shippingGroups: settings.shippingGroups,
    selectedCatalogCategories: queries.selectedCatalogCategories,
    selectedCatalogCurrencyCodes,
    selectedCategoryLabelById,
    catalogCurrencyCodesByCatalogId,
  });

  return {
    catalogCurrencyCodesByCatalogId,
    selectedCatalogCurrencyCodes,
    selectedCategoryLabelById,
    summaries,
  };
};

const useShippingGroupsModalDerivedState = ({
  local,
  queries,
  selected,
  settings,
}: {
  local: ShippingGroupsLocalState;
  queries: ShippingGroupsQueryState;
  selected: ShippingGroupsSelectedState;
  settings: ShippingGroupsSettingsState;
}): ShippingGroupsModalDerivedState => {
  const normalizedModalRuleIds = useMemo(
    () =>
      normalizeShippingGroupRuleCategoryIds({
        categoryIds: local.formData.autoAssignCategoryIds,
        categories: queries.modalCatalogCategories,
      }),
    [local.formData.autoAssignCategoryIds, queries.modalCatalogCategories]
  );
  const modalCatalogCurrencyCodes = useMemo(
    () => selected.catalogCurrencyCodesByCatalogId.get(local.formData.catalogId) ?? [],
    [local.formData.catalogId, selected.catalogCurrencyCodesByCatalogId]
  );
  const normalizedModalCurrencyCodes = useMemo(
    () =>
      normalizeShippingGroupRuleCurrencyCodes({
        currencyCodes: local.formData.autoAssignCurrencyCodes,
        availableCurrencyCodes: modalCatalogCurrencyCodes,
      }),
    [local.formData.autoAssignCurrencyCodes, modalCatalogCurrencyCodes]
  );
  const modalCategoryLabelById = useMemo(
    () => buildCategoryPathLabelMap(queries.modalCatalogCategories),
    [queries.modalCatalogCategories]
  );

  return {
    normalizedModalRuleIds,
    normalizedModalCurrencyCodes,
    redundantModalRuleIds: normalizedModalRuleIds,
    modalCategoryLabelById,
    modalShippingGroupRuleConflicts: useModalShippingGroupRuleConflicts({
      editingShippingGroup: local.editingShippingGroup,
      formData: local.formData,
      modalCatalogCategories: queries.modalCatalogCategories,
      modalCatalogCurrencyCodes,
      modalCatalogShippingGroups: queries.modalCatalogShippingGroups,
      normalizedModalCurrencyCodes,
      normalizedModalRuleIds,
    }),
    modalState: useShippingGroupsModalState({
      formData: local.formData,
      modalCatalogCategories: queries.modalCatalogCategories,
      modalCategoryLabelById,
      modalCatalogCurrencyCodes,
      normalizedModalRuleIds,
      normalizedModalCurrencyCodes,
      catalogs: settings.catalogs,
    }),
  };
};

const useShippingGroupsMutations = (): ShippingGroupsMutations => ({
  saveShippingGroupMutation: useSaveShippingGroupMutation(),
  deleteShippingGroupMutation: useDeleteShippingGroupMutation(),
});

export const useShippingGroupsStateValue = (): ShippingGroupsStateValue => {
  const settings = useShippingGroupsSettingsState();
  const local = useShippingGroupsLocalState();
  const queries = useShippingGroupsQueryState({
    selectedCatalogId: settings.selectedCatalogId,
    formCatalogId: local.formData.catalogId,
    showModal: local.showModal,
  });
  const mutations = useShippingGroupsMutations();
  const selected = useShippingGroupsSelectedState({ settings, queries });
  const modal = useShippingGroupsModalDerivedState({ local, queries, selected, settings });
  const actions = useShippingGroupsActions({ local, modal, queries, selected, settings, mutations });
  const repair = useShippingGroupsRepair({
    onRefresh: settings.onRefresh,
    saveShippingGroupMutation: mutations.saveShippingGroupMutation,
    selectedCatalogCategories: queries.selectedCatalogCategories,
    selectedCatalogCurrencyCodes: selected.selectedCatalogCurrencyCodes,
    shippingGroupConflictSummaryById: selected.summaries.conflictSummaryById,
    shippingGroupMissingRuleSummaryById: selected.summaries.missingRuleSummaryById,
    shippingGroupRedundantRuleSummaryById: selected.summaries.redundantRuleSummaryById,
    shippingGroups: settings.shippingGroups,
    toast: local.toast,
  });

  return composeShippingGroupsStateValue({
    ...settings,
    ...local,
    ...queries,
    ...mutations,
    ...actions,
    ...repair,
    selectedCategoryLabelById: selected.selectedCategoryLabelById,
    modalCategoryLabelById: modal.modalCategoryLabelById,
    normalizedModalRuleIds: modal.normalizedModalRuleIds,
    normalizedModalCurrencyCodes: modal.normalizedModalCurrencyCodes,
    redundantModalRuleIds: modal.redundantModalRuleIds,
    modalShippingGroupRuleConflicts: modal.modalShippingGroupRuleConflicts,
    ...modal.modalState,
    shippingGroupConflictSummaryById: selected.summaries.conflictSummaryById,
    shippingGroupEffectiveRuleDisplayById: selected.summaries.effectiveRuleDisplayById,
    shippingGroupRedundantRuleSummaryById: selected.summaries.redundantRuleSummaryById,
    shippingGroupMissingRuleSummaryById: selected.summaries.missingRuleSummaryById,
  });
};
