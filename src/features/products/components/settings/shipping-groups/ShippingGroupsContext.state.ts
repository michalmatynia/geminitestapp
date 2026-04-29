'use client';

import { useMemo } from 'react';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import {
  formatCategoryRuleSummary,
  formatCurrencyRuleSummary,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { normalizeCurrencyCode } from '@/shared/lib/products/utils/priceCalculation';
import {
  summarizeRuleDescendantCoverage,
  toTrimmedString,
} from './shipping-group-utils';
import type { ShippingGroupFormData } from '@/shared/contracts/products/shipping-groups';

type ShippingGroupsModalStateArgs = {
  formData: ShippingGroupFormData;
  modalCatalogCategories: ProductCategory[];
  modalCategoryLabelById: Map<string, string>;
  modalCatalogCurrencyCodes: string[];
  normalizedModalRuleIds: string[];
  normalizedModalCurrencyCodes: string[];
  catalogs: Catalog[];
};

type ShippingGroupsModalState = {
  catalogOptions: Array<LabeledOptionDto<string>>;
  modalCategoryOptions: Array<LabeledOptionDto<string>>;
  modalCurrencyOptions: Array<LabeledOptionDto<string>>;
  modalRuleCoverage: ReturnType<typeof summarizeRuleDescendantCoverage>;
  normalizedModalRuleSummary: ReturnType<typeof formatCategoryRuleSummary>;
  normalizedModalCurrencySummary: ReturnType<typeof formatCurrencyRuleSummary>;
  missingModalRuleSummary: string | null;
  shouldShowNormalizedModalRuleSummary: boolean;
};

const buildCatalogOptions = (catalogs: Catalog[]): Array<LabeledOptionDto<string>> =>
  catalogs.map((catalog: Catalog) => ({
    value: catalog.id,
    label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`,
  }));

const buildCategoryOptions = ({
  modalCatalogCategories,
  modalCategoryLabelById,
}: Pick<
  ShippingGroupsModalStateArgs,
  'modalCatalogCategories' | 'modalCategoryLabelById'
>): Array<LabeledOptionDto<string>> =>
  modalCatalogCategories.map((category) => ({
    value: category.id,
    label: modalCategoryLabelById.get(category.id) ?? category.name,
  }));

const buildCurrencyOptions = (
  modalCatalogCurrencyCodes: string[]
): Array<LabeledOptionDto<string>> =>
  modalCatalogCurrencyCodes.map((currencyCode) => ({
    value: currencyCode,
    label: currencyCode,
  }));

const normalizeNonEmptyCategoryIds = (categoryIds: string[]): string[] =>
  categoryIds
    .map((categoryId) => toTrimmedString(categoryId))
    .filter((categoryId) => categoryId.length > 0);

const normalizeNonEmptyCurrencyCodes = (currencyCodes: string[]): string[] =>
  currencyCodes
    .map((currencyCode) => normalizeCurrencyCode(currencyCode))
    .filter((currencyCode) => currencyCode.length > 0);

const buildMissingModalRuleSummary = ({
  formData,
  modalCategoryLabelById,
}: Pick<
  ShippingGroupsModalStateArgs,
  'formData' | 'modalCategoryLabelById'
>): string | null => {
  const missingRuleIds = normalizeNonEmptyCategoryIds(formData.autoAssignCategoryIds).filter(
    (categoryId) => !modalCategoryLabelById.has(categoryId)
  );
  return missingRuleIds.length > 0 ? missingRuleIds.join(', ') : null;
};

const hasNormalizedRuleChanges = ({
  formData,
  normalizedModalRuleIds,
  normalizedModalCurrencyCodes,
}: Pick<
  ShippingGroupsModalStateArgs,
  'formData' | 'normalizedModalRuleIds' | 'normalizedModalCurrencyCodes'
>): boolean => {
  const rawRuleIds = normalizeNonEmptyCategoryIds(formData.autoAssignCategoryIds);
  const rawCurrencyCodes = normalizeNonEmptyCurrencyCodes(formData.autoAssignCurrencyCodes);

  if (rawRuleIds.length !== normalizedModalRuleIds.length) return true;
  if (rawCurrencyCodes.length !== normalizedModalCurrencyCodes.length) return true;

  return (
    rawRuleIds.some((categoryId, index) => categoryId !== normalizedModalRuleIds[index]) ||
    rawCurrencyCodes.some((currencyCode, index) => currencyCode !== normalizedModalCurrencyCodes[index])
  );
};

export const useShippingGroupsModalState = (
  args: ShippingGroupsModalStateArgs
): ShippingGroupsModalState => {
  const { formData, modalCatalogCategories, modalCategoryLabelById, modalCatalogCurrencyCodes, normalizedModalRuleIds, normalizedModalCurrencyCodes, catalogs } = args;
  const catalogOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () => buildCatalogOptions(catalogs),
    [catalogs]
  );

  const modalCategoryOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () => buildCategoryOptions({ modalCatalogCategories, modalCategoryLabelById }),
    [modalCatalogCategories, modalCategoryLabelById]
  );

  const modalCurrencyOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () => buildCurrencyOptions(modalCatalogCurrencyCodes),
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

  const missingModalRuleSummary = useMemo(
    () => buildMissingModalRuleSummary({ formData, modalCategoryLabelById }),
    [formData, modalCategoryLabelById]
  );

  const shouldShowNormalizedModalRuleSummary = useMemo(
    () => hasNormalizedRuleChanges({ formData, normalizedModalRuleIds, normalizedModalCurrencyCodes }),
    [formData, normalizedModalCurrencyCodes, normalizedModalRuleIds]
  );

  return {
    catalogOptions,
    modalCategoryOptions,
    modalCurrencyOptions,
    modalRuleCoverage,
    normalizedModalRuleSummary,
    normalizedModalCurrencySummary,
    missingModalRuleSummary,
    shouldShowNormalizedModalRuleSummary,
  };
};
