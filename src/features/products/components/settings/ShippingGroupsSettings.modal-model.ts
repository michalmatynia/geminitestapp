import { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';
import {
  buildCategoryPathLabelMap,
  buildShippingGroupRuleConflicts,
  findRedundantShippingGroupRuleCategoryIds,
  formatCategoryRuleSummary,
  normalizeShippingGroupRuleCategoryIds,
  type ShippingGroupRuleConflict,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

import {
  DRAFT_SHIPPING_GROUP_ID,
  summarizeRuleDescendantCoverage,
} from '../../utils/shipping-group-settings-utils';
import type { ShippingGroupRuleCoverage } from './ShippingGroupsSettings.helpers';
import { getMissingRuleSummary, hasNormalizedRuleChanges } from './ShippingGroupsSettings.helpers';

type ModalRuleSummaries = {
  redundantRuleSummary: string | null;
  normalizedRuleSummary: string | null;
  missingRuleSummary: string | null;
  shouldShowNormalizedRuleSummary: boolean;
};

export type ShippingGroupsModalRuleModel = ModalRuleSummaries & {
  categoryLabelById: Map<string, string>;
  normalizedRuleIds: string[];
  categoryOptions: Array<LabeledOptionDto<string>>;
  ruleConflicts: ShippingGroupRuleConflict[];
  ruleCoverage: ShippingGroupRuleCoverage;
};

const buildCategoryOptions = (
  categories: readonly ProductCategory[],
  categoryLabelById: Map<string, string>
): Array<LabeledOptionDto<string>> =>
  categories.map((category) => ({
    value: category.id,
    label: categoryLabelById.get(category.id) ?? category.name,
  }));

const buildDraftShippingGroup = ({
  formData,
  editingShippingGroupId,
  draftRuleIds,
}: {
  formData: ShippingGroupFormData;
  editingShippingGroupId: string | undefined;
  draftRuleIds: readonly string[];
}): ProductShippingGroup => {
  const trimmedName = formData.name.trim();
  const trimmedDescription = formData.description.trim();
  const trimmedCondition = formData.traderaShippingCondition.trim();
  const trimmedPrice = formData.traderaShippingPriceEur.trim();
  const parsedPrice = Number(trimmedPrice);
  return {
    id: editingShippingGroupId ?? DRAFT_SHIPPING_GROUP_ID,
    name: trimmedName.length > 0 ? trimmedName : 'This shipping group',
    description: trimmedDescription.length > 0 ? trimmedDescription : null,
    catalogId: formData.catalogId,
    traderaShippingCondition: trimmedCondition.length > 0 ? trimmedCondition : null,
    traderaShippingPriceEur:
      trimmedPrice.length > 0 && Number.isFinite(parsedPrice) ? parsedPrice : null,
    autoAssignCategoryIds: [...draftRuleIds],
    autoAssignCurrencyCodes: [],
  };
};

const buildModalRuleConflicts = ({
  formData,
  editingShippingGroupId,
  draftRuleIds,
  modalCatalogShippingGroups,
  modalCatalogCategories,
}: {
  formData: ShippingGroupFormData;
  editingShippingGroupId: string | undefined;
  draftRuleIds: readonly string[];
  modalCatalogShippingGroups: readonly ProductShippingGroup[];
  modalCatalogCategories: readonly ProductCategory[];
}): ShippingGroupRuleConflict[] => {
  if (formData.catalogId.trim().length === 0 || draftRuleIds.length === 0) return [];
  const draftShippingGroup = buildDraftShippingGroup({ formData, editingShippingGroupId, draftRuleIds });
  const modalPeerShippingGroups = modalCatalogShippingGroups.filter(
    (shippingGroup) => shippingGroup.id !== draftShippingGroup.id
  );
  return buildShippingGroupRuleConflicts({
    shippingGroups: [draftShippingGroup, ...modalPeerShippingGroups],
    categories: modalCatalogCategories,
  }).filter((conflict) => conflict.groupIds.includes(draftShippingGroup.id));
};

const useModalRuleSummaries = ({
  formData,
  modalCatalogCategories,
  categoryLabelById,
  normalizedRuleIds,
}: {
  formData: ShippingGroupFormData;
  modalCatalogCategories: readonly ProductCategory[];
  categoryLabelById: Map<string, string>;
  normalizedRuleIds: readonly string[];
}): ModalRuleSummaries => {
  const redundantRuleSummary = useMemo(() => {
    const redundantRuleIds = findRedundantShippingGroupRuleCategoryIds({
      categoryIds: formData.autoAssignCategoryIds,
      categories: modalCatalogCategories,
    });
    return formatCategoryRuleSummary({ categoryIds: redundantRuleIds, categoryLabelById });
  }, [categoryLabelById, formData.autoAssignCategoryIds, modalCatalogCategories]);
  const normalizedRuleSummary = useMemo(
    () => formatCategoryRuleSummary({ categoryIds: normalizedRuleIds, categoryLabelById }),
    [categoryLabelById, normalizedRuleIds]
  );
  const missingRuleSummary = useMemo(
    () => getMissingRuleSummary(formData.autoAssignCategoryIds, categoryLabelById),
    [categoryLabelById, formData.autoAssignCategoryIds]
  );
  const shouldShowNormalizedRuleSummary = useMemo(
    () =>
      hasNormalizedRuleChanges({
        rawCategoryIds: formData.autoAssignCategoryIds,
        normalizedCategoryIds: normalizedRuleIds,
      }),
    [formData.autoAssignCategoryIds, normalizedRuleIds]
  );
  return {
    redundantRuleSummary,
    normalizedRuleSummary,
    missingRuleSummary,
    shouldShowNormalizedRuleSummary,
  };
};

export const useShippingGroupsModalRuleModel = ({
  formData,
  editingShippingGroup,
  modalCatalogCategories,
  modalCatalogShippingGroups,
}: {
  formData: ShippingGroupFormData;
  editingShippingGroup: ProductShippingGroup | null;
  modalCatalogCategories: readonly ProductCategory[];
  modalCatalogShippingGroups: readonly ProductShippingGroup[];
}): ShippingGroupsModalRuleModel => {
  const categoryLabelById = useMemo(() => buildCategoryPathLabelMap(modalCatalogCategories), [modalCatalogCategories]);
  const normalizedRuleIds = useMemo(
    () =>
      normalizeShippingGroupRuleCategoryIds({
        categoryIds: formData.autoAssignCategoryIds,
        categories: modalCatalogCategories,
      }),
    [formData.autoAssignCategoryIds, modalCatalogCategories]
  );
  const summaries = useModalRuleSummaries({
    formData,
    modalCatalogCategories,
    categoryLabelById,
    normalizedRuleIds,
  });
  const categoryOptions = useMemo(() => buildCategoryOptions(modalCatalogCategories, categoryLabelById), [categoryLabelById, modalCatalogCategories]);
  const ruleConflicts = useMemo(
    () =>
      buildModalRuleConflicts({
        formData,
        editingShippingGroupId: editingShippingGroup?.id,
        draftRuleIds: normalizedRuleIds,
        modalCatalogShippingGroups,
        modalCatalogCategories,
      }),
    [editingShippingGroup?.id, formData, modalCatalogCategories, modalCatalogShippingGroups, normalizedRuleIds]
  );
  const ruleCoverage = useMemo(
    () => summarizeRuleDescendantCoverage({ categoryIds: normalizedRuleIds, categories: modalCatalogCategories, categoryLabelById }),
    [categoryLabelById, modalCatalogCategories, normalizedRuleIds]
  );
  return {
    categoryLabelById,
    normalizedRuleIds,
    categoryOptions,
    ruleConflicts,
    ruleCoverage,
    ...summaries,
  };
};
