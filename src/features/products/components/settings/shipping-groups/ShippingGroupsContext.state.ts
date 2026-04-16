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

export const useShippingGroupsModalState = ({
  formData,
  modalCatalogCategories,
  modalCategoryLabelById,
  modalCatalogCurrencyCodes,
  normalizedModalRuleIds,
  normalizedModalCurrencyCodes,
  catalogs,
}: {
  formData: ShippingGroupFormData;
  modalCatalogCategories: ProductCategory[];
  modalCategoryLabelById: Map<string, string>;
  modalCatalogCurrencyCodes: string[];
  normalizedModalRuleIds: string[];
  normalizedModalCurrencyCodes: string[];
  catalogs: Catalog[];
}) => {
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
