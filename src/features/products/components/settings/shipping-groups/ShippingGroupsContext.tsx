'use client';

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
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
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import {
  toTrimmedString,
  readConflictMetaFromApiError,
  formatShippingGroupConflictMessage,
  DRAFT_SHIPPING_GROUP_ID,
  summarizeRuleDescendantCoverage,
} from './shipping-group-utils';
import {
  buildCategoryPathLabelMap,
  buildShippingGroupRuleConflicts,
  formatCurrencyRuleSummary,
  findRedundantShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCategoryIds,
  normalizeShippingGroupRuleCurrencyCodes,
  formatCategoryRuleSummary,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { matchesPriceGroupIdentifier } from '@/shared/lib/products/utils/price-group-identifiers';
import { normalizeCurrencyCode } from '@/shared/lib/products/utils/priceCalculation';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export type ShippingGroupFormData = {
  name: string;
  description: string;
  catalogId: string;
  traderaShippingCondition: string;
  traderaShippingPriceEur: string;
  autoAssignCategoryIds: string[];
  autoAssignCurrencyCodes: string[];
};

type ShippingGroupToast = ReturnType<typeof useToast>['toast'];
type ShippingGroupSaveMutation = ReturnType<typeof useSaveShippingGroupMutation>;
type ShippingGroupDeleteMutation = ReturnType<typeof useDeleteShippingGroupMutation>;
type ShippingGroupRuleConflict = ReturnType<typeof buildShippingGroupRuleConflicts>[number];
type ShippingGroupRuleCoverage = ReturnType<typeof summarizeRuleDescendantCoverage>;

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

  const normalizedModalRuleIds = useMemo(
    () =>
      normalizeShippingGroupRuleCategoryIds({
        categoryIds: formData.autoAssignCategoryIds,
        categories: modalCatalogCategories,
      }),
    [formData.autoAssignCategoryIds, modalCatalogCategories]
  );
  const catalogCurrencyCodesByCatalogId = useMemo(() => {
    const entries = new Map<string, string[]>();

    for (const catalog of catalogs) {
      const catalogPriceGroupIds = Array.isArray(catalog.priceGroupIds) ? catalog.priceGroupIds : [];
      const candidatePriceGroups =
        catalogPriceGroupIds.length > 0
          ? priceGroups.filter((priceGroup) =>
              catalogPriceGroupIds.some((identifier) => matchesPriceGroupIdentifier(priceGroup, identifier))
            )
          : priceGroups;

      entries.set(
        catalog.id,
        Array.from(
          new Set(
            candidatePriceGroups
              .map((priceGroup) =>
                normalizeCurrencyCode(priceGroup.currencyCode ?? priceGroup.currencyId ?? '')
              )
              .filter(Boolean)
          )
        )
      );
    }

    return entries;
  }, [catalogs, priceGroups]);
  const modalCatalogCurrencyCodes = useMemo(
    () => catalogCurrencyCodesByCatalogId.get(formData.catalogId) ?? [],
    [catalogCurrencyCodesByCatalogId, formData.catalogId]
  );
  const selectedCatalogCurrencyCodes = useMemo(
    () => (selectedCatalogId ? catalogCurrencyCodesByCatalogId.get(selectedCatalogId) ?? [] : []),
    [catalogCurrencyCodesByCatalogId, selectedCatalogId]
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
      findRedundantShippingGroupRuleCategoryIds({
        categoryIds: formData.autoAssignCategoryIds,
        categories: modalCatalogCategories,
      }),
    [formData.autoAssignCategoryIds, modalCatalogCategories]
  );

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

  const selectedCategoryLabelById = useMemo(
    () => buildCategoryPathLabelMap(selectedCatalogCategories),
    [selectedCatalogCategories]
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
          draftShippingGroupId: editingShippingGroup?.id ?? DRAFT_SHIPPING_GROUP_ID,
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
              draftShippingGroupId: editingShippingGroup?.id ?? DRAFT_SHIPPING_GROUP_ID,
            })
          : error instanceof Error
            ? error.message
            : 'Failed to save shipping group.';
      toast(message, { variant: 'error' });
    }
  };

  const handleDelete = useCallback((shippingGroup: ProductShippingGroup): void => {
    setShippingGroupToDelete(shippingGroup);
  }, []);

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

  const shippingGroupRuleConflicts = useMemo(
    () =>
      buildShippingGroupRuleConflicts({
        shippingGroups,
        categories: selectedCatalogCategories,
        availableCurrencyCodes: selectedCatalogCurrencyCodes,
      }),
    [selectedCatalogCategories, selectedCatalogCurrencyCodes, shippingGroups]
  );

  const shippingGroupConflictSummaryById = useMemo(() => {
    const entriesById = new Map<string, string[]>();

    for (const conflict of shippingGroupRuleConflicts) {
      const overlapLabel =
        conflict.appliesToAllCategories
          ? 'all categories'
          : (formatCategoryRuleSummary({
              categoryIds: conflict.overlapCategoryIds,
              categoryLabelById: selectedCategoryLabelById,
            }) ?? `${conflict.overlapCategoryIds.length} categories`);
      const overlapCurrencyLabel =
        conflict.appliesToAllCurrencies
          ? 'all currencies'
          : (formatCurrencyRuleSummary({
              currencyCodes: conflict.overlapCurrencyCodes,
            }) ?? `${conflict.overlapCurrencyCodes.length} currencies`);

      const [leftGroupId, rightGroupId] = conflict.groupIds;
      const [leftGroupName, rightGroupName] = conflict.groupNames;

      entriesById.set(leftGroupId, [
        ...(entriesById.get(leftGroupId) ?? []),
        `overlaps ${rightGroupName} on ${overlapLabel} in ${overlapCurrencyLabel}`,
      ]);
      entriesById.set(rightGroupId, [
        ...(entriesById.get(rightGroupId) ?? []),
        `overlaps ${leftGroupName} on ${overlapLabel} in ${overlapCurrencyLabel}`,
      ]);
    }

    const summaryById = new Map<string, string | null>();
    for (const shippingGroup of shippingGroups) {
      const entries = entriesById.get(shippingGroup.id) ?? [];
      summaryById.set(
        shippingGroup.id,
        entries.length === 0
          ? null
          : entries.length === 1
            ? entries[0]!
            : `${entries[0]} +${entries.length - 1} more`
      );
    }

    return summaryById;
  }, [selectedCategoryLabelById, shippingGroupRuleConflicts, shippingGroups]);

  const shippingGroupNormalizedRuleSummaryById = useMemo(() => {
    const summaryById = new Map<string, string | null>();

    for (const shippingGroup of shippingGroups) {
      const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
        categoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
          ? shippingGroup.autoAssignCategoryIds
          : [],
        categories: selectedCatalogCategories,
      });

      summaryById.set(
        shippingGroup.id,
        formatCategoryRuleSummary({
          categoryIds: normalizedRuleIds,
          categoryLabelById: selectedCategoryLabelById,
        })
      );
    }

    return summaryById;
  }, [selectedCatalogCategories, selectedCategoryLabelById, shippingGroups]);

  const shippingGroupRedundantRuleSummaryById = useMemo(() => {
    const summaryById = new Map<string, string | null>();

    for (const shippingGroup of shippingGroups) {
      const redundantRuleIds = findRedundantShippingGroupRuleCategoryIds({
        categoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
          ? shippingGroup.autoAssignCategoryIds
          : [],
        categories: selectedCatalogCategories,
      });

      summaryById.set(
        shippingGroup.id,
        formatCategoryRuleSummary({
          categoryIds: redundantRuleIds,
          categoryLabelById: selectedCategoryLabelById,
        })
      );
    }

    return summaryById;
  }, [selectedCatalogCategories, selectedCategoryLabelById, shippingGroups]);

  const shippingGroupRuleCoverageById = useMemo(() => {
    const coverageById = new Map<
      string,
      {
        descendantIds: string[];
        descendantSummary: string | null;
      }
    >();

    for (const shippingGroup of shippingGroups) {
      const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
        categoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
          ? shippingGroup.autoAssignCategoryIds
          : [],
        categories: selectedCatalogCategories,
      });

      coverageById.set(
        shippingGroup.id,
        summarizeRuleDescendantCoverage({
          categoryIds: normalizedRuleIds,
          categories: selectedCatalogCategories,
          categoryLabelById: selectedCategoryLabelById,
        })
      );
    }

    return coverageById;
  }, [selectedCatalogCategories, selectedCategoryLabelById, shippingGroups]);

  const shippingGroupEffectiveRuleDisplayById = useMemo(() => {
    const displayById = new Map<string, string>();

    for (const shippingGroup of shippingGroups) {
      const normalizedSummary = shippingGroupNormalizedRuleSummaryById.get(shippingGroup.id);
      const currencySummary = formatCurrencyRuleSummary({
        currencyCodes: normalizeShippingGroupRuleCurrencyCodes({
          currencyCodes: shippingGroup.autoAssignCurrencyCodes ?? [],
          availableCurrencyCodes:
            catalogCurrencyCodesByCatalogId.get(shippingGroup.catalogId) ?? [],
        }),
      });
      const hasDescendants =
        (shippingGroupRuleCoverageById.get(shippingGroup.id)?.descendantIds.length ?? 0) > 0;
      const categoryDisplay = normalizedSummary
        ? `${normalizedSummary}${hasDescendants ? ' (+ descendants)' : ''}`
        : '';
      const currencyDisplay = currencySummary ? `currencies: ${currencySummary}` : '';
      const display = [categoryDisplay, currencyDisplay].filter(Boolean).join(' · ');

      displayById.set(
        shippingGroup.id,
        display || 'None'
      );
    }

    return displayById;
  }, [
    catalogCurrencyCodesByCatalogId,
    shippingGroupNormalizedRuleSummaryById,
    shippingGroupRuleCoverageById,
    shippingGroups,
  ]);

  const shippingGroupMissingRuleSummaryById = useMemo(() => {
    const summaryById = new Map<string, string | null>();

    for (const shippingGroup of shippingGroups) {
      const missingRuleIds = (Array.isArray(shippingGroup.autoAssignCategoryIds)
        ? shippingGroup.autoAssignCategoryIds
        : []
      )
        .map((categoryId) => toTrimmedString(categoryId))
        .filter((categoryId) => categoryId.length > 0 && !selectedCategoryLabelById.has(categoryId));

      summaryById.set(
        shippingGroup.id,
        missingRuleIds.length > 0 ? missingRuleIds.join(', ') : null
      );
    }

    return summaryById;
  }, [selectedCategoryLabelById, shippingGroups]);

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

  const handleRepairAllSafeRules = useCallback(async (): Promise<void> => {
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
  }, [
    onRefresh,
    saveShippingGroupMutation,
    selectedCatalogCategories,
    selectedCatalogCurrencyCodes,
    shippingGroupsWithRepairAvailable,
    toast,
  ]);

  const catalogOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      catalogs.map((catalog: Catalog) => ({
        value: catalog.id,
        label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`,
      })),
    [catalogs]
  );

  const modalCategoryOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      modalCatalogCategories.map((category) => ({
        value: category.id,
        label: modalCategoryLabelById.get(category.id) ?? category.name,
      })),
    [modalCatalogCategories, modalCategoryLabelById]
  );
  const modalCurrencyOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      modalCatalogCurrencyCodes.map((currencyCode) => ({
        value: currencyCode,
        label: currencyCode,
      })),
    [modalCatalogCurrencyCodes]
  );

  const modalRuleCoverage = useMemo(
    () =>
      summarizeRuleDescendantCoverage({
        categoryIds: normalizedModalRuleIds,
        categories: modalCatalogCategories,
        categoryLabelById: modalCategoryLabelById,
      }),
    [modalCatalogCategories, modalCategoryLabelById, normalizedModalRuleIds]
  );

  const redundantModalRuleSummary = useMemo(
    () =>
      formatCategoryRuleSummary({
        categoryIds: redundantModalRuleIds,
        categoryLabelById: modalCategoryLabelById,
      }),
    [modalCategoryLabelById, redundantModalRuleIds]
  );
  const normalizedModalRuleSummary = useMemo(
    () =>
      formatCategoryRuleSummary({
        categoryIds: normalizedModalRuleIds,
        categoryLabelById: modalCategoryLabelById,
      }),
    [modalCategoryLabelById, normalizedModalRuleIds]
  );
  const normalizedModalCurrencySummary = useMemo(
    () =>
      formatCurrencyRuleSummary({
        currencyCodes: normalizedModalCurrencyCodes,
      }),
    [normalizedModalCurrencyCodes]
  );
  const missingModalRuleSummary = useMemo(() => {
    const missingRuleIds = formData.autoAssignCategoryIds
      .map((categoryId) => toTrimmedString(categoryId))
      .filter((categoryId) => categoryId.length > 0 && !modalCategoryLabelById.has(categoryId));

    return missingRuleIds.length > 0 ? missingRuleIds.join(', ') : null;
  }, [formData.autoAssignCategoryIds, modalCategoryLabelById]);
  const shouldShowNormalizedModalRuleSummary = useMemo(() => {
    const rawRuleIds = formData.autoAssignCategoryIds
      .map((categoryId) => toTrimmedString(categoryId))
      .filter(Boolean);
    const rawCurrencyCodes = formData.autoAssignCurrencyCodes
      .map((currencyCode) => normalizeCurrencyCode(currencyCode))
      .filter(Boolean);

    if (rawRuleIds.length !== normalizedModalRuleIds.length) {
      return true;
    }
    if (rawCurrencyCodes.length !== normalizedModalCurrencyCodes.length) {
      return true;
    }

    return (
      rawRuleIds.some((categoryId, index) => categoryId !== normalizedModalRuleIds[index]) ||
      rawCurrencyCodes.some(
        (currencyCode, index) => currencyCode !== normalizedModalCurrencyCodes[index]
      )
    );
  }, [
    formData.autoAssignCategoryIds,
    formData.autoAssignCurrencyCodes,
    normalizedModalCurrencyCodes,
    normalizedModalRuleIds,
  ]);

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
    redundantModalRuleSummary,
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

export function useShippingGroupsState(): ShippingGroupsStateValue {
  const context = useContext(ShippingGroupsStateContext);
  if (!context) {
    throw new Error('useShippingGroupsState must be used within a ShippingGroupsStateProvider');
  }
  return context;
}
