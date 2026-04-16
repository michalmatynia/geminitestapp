'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
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
import { useToast } from '@/shared/ui/toast';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';
import {
  DRAFT_SHIPPING_GROUP_ID,
} from './shipping-group-utils';
import {
  buildCategoryPathLabelMap,
  buildShippingGroupRuleConflicts,
  normalizeShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCurrencyCodes,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import {
  useCatalogCurrencyCodes,
  useShippingGroupSummaries,
} from './ShippingGroupsContext.hooks';
import { useShippingGroupHandlers } from './ShippingGroupsContext.handlers';
import { useShippingGroupsModalState } from './ShippingGroupsContext.state';

type ShippingGroupToast = ReturnType<typeof useToast>['toast'];
type ShippingGroupSaveMutation = ReturnType<typeof useSaveShippingGroupMutation>;
type ShippingGroupDeleteMutation = ReturnType<typeof useDeleteShippingGroupMutation>;
type ShippingGroupRuleConflict = ReturnType<typeof buildShippingGroupRuleConflicts>[number];
type ShippingGroupRuleCoverage = ReturnType<typeof useShippingGroupsModalState>['modalRuleCoverage'];

type ShippingGroupsStateValue = {
  loading: boolean;
  shippingGroups: ProductShippingGroup[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string | null) => void;
  onRefresh: () => void;
  toast: ShippingGroupToast;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  editingShippingGroup: ProductShippingGroup | null;
  shippingGroupToDelete: ProductShippingGroup | null;
  setShippingGroupToDelete: (group: ProductShippingGroup | null) => void;
  formData: ShippingGroupFormData;
  setFormData: React.Dispatch<React.SetStateAction<ShippingGroupFormData>>;
  selectedCatalogCategories: ProductCategory[];
  loadingSelectedCatalogCategories: boolean;
  modalCatalogCategories: ProductCategory[];
  loadingModalCatalogCategories: boolean;
  modalCatalogShippingGroups: ProductShippingGroup[];
  loadingModalCatalogShippingGroups: boolean;
  saveShippingGroupMutation: ShippingGroupSaveMutation;
  deleteShippingGroupMutation: ShippingGroupDeleteMutation;
  normalizedModalRuleIds: string[];
  normalizedModalCurrencyCodes: string[];
  redundantModalRuleIds: string[];
  openCreateModal: () => void;
  openEditModal: (shippingGroup: ProductShippingGroup) => void;
  handleSave: () => Promise<void>;
  handleDelete: (shippingGroup: ProductShippingGroup) => void;
  handleConfirmDelete: () => Promise<void>;
  handleRepairRule: (shippingGroup: ProductShippingGroup) => Promise<void>;
  handleRepairAllSafeRules: () => Promise<void>;
  catalogOptions: LabeledOptionDto<string>[];
  selectedCategoryLabelById: Map<string, string>;
  modalCategoryLabelById: Map<string, string>;
  modalCategoryOptions: LabeledOptionDto<string>[];
  modalCurrencyOptions: LabeledOptionDto<string>[];
  shippingGroupConflictSummaryById: Map<string, string | null>;
  shippingGroupEffectiveRuleDisplayById: Map<string, string>;
  shippingGroupRedundantRuleSummaryById: Map<string, string | null>;
  shippingGroupMissingRuleSummaryById: Map<string, string | null>;
  shippingGroupsWithRepairAvailable: ProductShippingGroup[];
  modalShippingGroupRuleConflicts: ShippingGroupRuleConflict[];
  modalRuleCoverage: ShippingGroupRuleCoverage;
  redundantModalRuleSummary: string | null;
  normalizedModalRuleSummary: string | null;
  normalizedModalCurrencySummary: string | null;
  missingModalRuleSummary: string | null;
  shouldShowNormalizedModalRuleSummary: boolean;
};

const ShippingGroupsStateContext = createContext<ShippingGroupsStateValue | null>(null);

export function ShippingGroupsStateProvider({ children }: { children: React.ReactNode }) {
  const {
    loadingShippingGroups: loading,
    shippingGroups,
    catalogs,
    selectedShippingGroupCatalogId: selectedCatalogId,
    onShippingGroupCatalogChange: onCatalogChange,
    onRefreshShippingGroups: onRefresh,
  } = useProductSettingsShippingGroupsContext();
  const { priceGroups } = useProductSettingsPriceGroupsContext();

  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingShippingGroup, setEditingShippingGroup] = useState<ProductShippingGroup | null>(null);
  const [shippingGroupToDelete, setShippingGroupToDelete] =
    useState<ProductShippingGroup | null>(null);
  const [formData, setFormData] = useState<ShippingGroupFormData>({
    name: '',
    description: '',
    catalogId: '',
    traderaShippingCondition: '',
    traderaShippingPriceEur: '',
    autoAssignCategoryIds: [],
    autoAssignCurrencyCodes: [],
  });

  const {
    data: selectedCatalogCategories = [],
    isLoading: loadingSelectedCatalogCategories,
  } = useProductMetadataCategories(selectedCatalogId ?? undefined, {
    enabled: Boolean(selectedCatalogId),
  });
  const {
    data: modalCatalogCategories = [],
    isLoading: loadingModalCatalogCategories,
  } = useProductMetadataCategories(formData.catalogId || undefined, {
    enabled: Boolean(formData.catalogId),
  });
  const {
    data: modalCatalogShippingGroups = [],
    isLoading: loadingModalCatalogShippingGroups,
  } = useProductMetadataShippingGroups(formData.catalogId || undefined, {
    enabled: Boolean(formData.catalogId) && showModal,
  });

  const saveShippingGroupMutation = useSaveShippingGroupMutation();
  const deleteShippingGroupMutation = useDeleteShippingGroupMutation();

  const catalogCurrencyCodesByCatalogId = useCatalogCurrencyCodes(catalogs, priceGroups);

  const selectedCatalogCurrencyCodes = useMemo(
    () => (selectedCatalogId ? catalogCurrencyCodesByCatalogId.get(selectedCatalogId) ?? [] : []),
    [catalogCurrencyCodesByCatalogId, selectedCatalogId]
  );

  const selectedCategoryLabelById = useMemo(
    () => buildCategoryPathLabelMap(selectedCatalogCategories),
    [selectedCatalogCategories]
  );

  const {
    conflictSummaryById: shippingGroupConflictSummaryById,
    redundantRuleSummaryById: shippingGroupRedundantRuleSummaryById,
    effectiveRuleDisplayById: shippingGroupEffectiveRuleDisplayById,
    missingRuleSummaryById: shippingGroupMissingRuleSummaryById,
  } = useShippingGroupSummaries({
    shippingGroups,
    selectedCatalogCategories,
    selectedCatalogCurrencyCodes,
    selectedCategoryLabelById,
    catalogCurrencyCodesByCatalogId,
  });

  const normalizedModalRuleIds = useMemo(
    () =>
      normalizeShippingGroupRuleCategoryIds({
        categoryIds: formData.autoAssignCategoryIds,
        categories: modalCatalogCategories,
      }),
    [formData.autoAssignCategoryIds, modalCatalogCategories]
  );

  const modalCatalogCurrencyCodes = useMemo(
    () => catalogCurrencyCodesByCatalogId.get(formData.catalogId) ?? [],
    [catalogCurrencyCodesByCatalogId, formData.catalogId]
  );

  const normalizedModalCurrencyCodes = useMemo(
    () =>
      normalizeShippingGroupRuleCurrencyCodes({
        currencyCodes: formData.autoAssignCurrencyCodes,
        availableCurrencyCodes: modalCatalogCurrencyCodes,
      }),
    [formData.autoAssignCurrencyCodes, modalCatalogCurrencyCodes]
  );

  const redundantModalRuleIds = useMemo(
    () =>
      normalizeShippingGroupRuleCategoryIds({
        categoryIds: formData.autoAssignCategoryIds,
        categories: modalCatalogCategories,
      }),
    [formData.autoAssignCategoryIds, modalCatalogCategories]
  );

  const modalCategoryLabelById = useMemo(
    () => buildCategoryPathLabelMap(modalCatalogCategories),
    [modalCatalogCategories]
  );

  const modalShippingGroupRuleConflicts = useMemo(() => {
    const draftRuleIds = normalizedModalRuleIds;
    if (!formData.catalogId || draftRuleIds.length === 0) {
      return [];
    }

    const draftShippingGroup: ProductShippingGroup = {
      id: editingShippingGroup?.id ?? DRAFT_SHIPPING_GROUP_ID,
      name: formData.name.trim() || 'This shipping group',
      description: formData.description.trim() || null,
      catalogId: formData.catalogId,
      traderaShippingCondition: formData.traderaShippingCondition.trim() || null,
      traderaShippingPriceEur: formData.traderaShippingPriceEur.trim()
        ? Number(formData.traderaShippingPriceEur)
        : null,
      autoAssignCategoryIds: draftRuleIds,
      autoAssignCurrencyCodes: normalizedModalCurrencyCodes,
    };
    const modalPeerShippingGroups = modalCatalogShippingGroups.filter(
      (shippingGroup) => shippingGroup.id !== draftShippingGroup.id
    );

    return buildShippingGroupRuleConflicts({
      shippingGroups: [draftShippingGroup, ...modalPeerShippingGroups],
      categories: modalCatalogCategories,
      availableCurrencyCodes: modalCatalogCurrencyCodes,
    }).filter((conflict) => conflict.groupIds.includes(draftShippingGroup.id));
  }, [
    editingShippingGroup?.id,
    formData.catalogId,
    formData.description,
    formData.name,
    formData.traderaShippingCondition,
    formData.traderaShippingPriceEur,
    modalCatalogCategories,
    modalCatalogCurrencyCodes,
    modalCatalogShippingGroups,
    normalizedModalCurrencyCodes,
    normalizedModalRuleIds,
  ]);

  const {
    catalogOptions,
    modalCategoryOptions,
    modalCurrencyOptions,
    modalRuleCoverage,
    normalizedModalRuleSummary,
    normalizedModalCurrencySummary,
    missingModalRuleSummary,
    shouldShowNormalizedModalRuleSummary,
  } = useShippingGroupsModalState({
    formData,
    modalCatalogCategories,
    modalCategoryLabelById,
    modalCatalogCurrencyCodes,
    normalizedModalRuleIds,
    normalizedModalCurrencyCodes,
    catalogs,
  });

  const {
    handleSave,
    handleDelete,
    handleConfirmDelete,
    handleRepairRule,
  } = useShippingGroupHandlers({
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
  });

  const openCreateModal = (): void => {
    if (!selectedCatalogId) {
      toast('Please select a catalog first.', { variant: 'error' });
      return;
    }
    setEditingShippingGroup(null);
    setFormData({
      name: '',
      description: '',
      catalogId: selectedCatalogId,
      traderaShippingCondition: '',
      traderaShippingPriceEur: '',
      autoAssignCategoryIds: [],
      autoAssignCurrencyCodes: [],
    });
    setShowModal(true);
  };

  const openEditModal = (shippingGroup: ProductShippingGroup): void => {
    setEditingShippingGroup(shippingGroup);
    setFormData({
      name: shippingGroup.name,
      description: shippingGroup.description ?? '',
      catalogId: shippingGroup.catalogId,
      traderaShippingCondition: shippingGroup.traderaShippingCondition ?? '',
      traderaShippingPriceEur:
        typeof shippingGroup.traderaShippingPriceEur === 'number' &&
        Number.isFinite(shippingGroup.traderaShippingPriceEur)
          ? String(shippingGroup.traderaShippingPriceEur)
          : '',
      autoAssignCategoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
        ? shippingGroup.autoAssignCategoryIds
        : [],
      autoAssignCurrencyCodes: Array.isArray(shippingGroup.autoAssignCurrencyCodes)
        ? shippingGroup.autoAssignCurrencyCodes
        : [],
    });
    setShowModal(true);
  };

  const shippingGroupsWithRepairAvailable = useMemo(
    () =>
      shippingGroups.filter(
        (shippingGroup) =>
          (Boolean(shippingGroupRedundantRuleSummaryById.get(shippingGroup.id)) ||
            Boolean(shippingGroupMissingRuleSummaryById.get(shippingGroup.id))) &&
          !shippingGroupConflictSummaryById.get(shippingGroup.id)
      ),
    [
      shippingGroupConflictSummaryById,
      shippingGroupMissingRuleSummaryById,
      shippingGroupRedundantRuleSummaryById,
      shippingGroups,
    ]
  );

  const handleRepairAllSafeRules = async (): Promise<void> => {
    if (shippingGroupsWithRepairAvailable.length === 0) {
      return;
    }

    try {
      for (const shippingGroup of shippingGroupsWithRepairAvailable) {
        const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
          categoryIds: shippingGroup.autoAssignCategoryIds ?? [],
          categories: selectedCatalogCategories,
        });

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
      }

      toast(`Repaired ${shippingGroupsWithRepairAvailable.length} shipping group rules.`, {
        variant: 'success',
      });
      onRefresh();
    } catch (error) {
      logClientCatch(error, {
        source: 'ShippingGroupsSettings',
        action: 'repairAllSafeRules',
      });
      toast('Failed to repair one or more rules.', { variant: 'error' });
    }
  };

  const value: ShippingGroupsStateValue = {
    loading,
    shippingGroups,
    catalogs,
    selectedCatalogId,
    onCatalogChange,
    onRefresh,
    toast,
    showModal,
    setShowModal,
    editingShippingGroup,
    shippingGroupToDelete,
    setShippingGroupToDelete,
    formData,
    setFormData,
    selectedCatalogCategories,
    loadingSelectedCatalogCategories,
    modalCatalogCategories,
    loadingModalCatalogCategories,
    modalCatalogShippingGroups,
    loadingModalCatalogShippingGroups,
    saveShippingGroupMutation,
    deleteShippingGroupMutation,
    normalizedModalRuleIds,
    normalizedModalCurrencyCodes,
    redundantModalRuleIds,
    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,
    handleConfirmDelete,
    handleRepairRule,
    handleRepairAllSafeRules,
    catalogOptions,
    selectedCategoryLabelById,
    modalCategoryLabelById,
    modalCategoryOptions,
    modalCurrencyOptions,
    shippingGroupConflictSummaryById,
    shippingGroupEffectiveRuleDisplayById,
    shippingGroupRedundantRuleSummaryById,
    shippingGroupMissingRuleSummaryById,
    shippingGroupsWithRepairAvailable,
    modalShippingGroupRuleConflicts,
    modalRuleCoverage,
    redundantModalRuleSummary: null, // Simplified
    normalizedModalRuleSummary,
    normalizedModalCurrencySummary,
    missingModalRuleSummary,
    shouldShowNormalizedModalRuleSummary,
  };

  return (
    <ShippingGroupsStateContext.Provider value={value}>
      {children}
    </ShippingGroupsStateContext.Provider>
  );
}

import { internalError } from '@/shared/errors/app-error';

export function useShippingGroupsState(): ShippingGroupsStateValue {
  const context = useContext(ShippingGroupsStateContext);
  if (!context) {
    throw internalError('useShippingGroupsState must be used within a ShippingGroupsStateProvider');
  }
  return context;
}
