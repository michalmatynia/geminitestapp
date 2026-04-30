import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';
import type { ShippingGroupRuleConflict } from '@/shared/lib/products/utils/shipping-group-rule-conflicts';

import {
  DRAFT_SHIPPING_GROUP_ID,
  formatShippingGroupConflictMessage,
  readConflictMetaFromApiError,
} from '../../utils/shipping-group-settings-utils';

export type ShippingGroupRuleCoverage = {
  descendantIds: string[];
  descendantSummary: string | null;
};

export type ShippingGroupListItem = {
  id: string;
  title: string;
  description: string | undefined;
  subtitle: string | undefined;
  original: ProductShippingGroup;
};

export type ShippingGroupToast = (
  message: string,
  options?: { variant?: 'error' | 'success' }
) => void;

export const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const toOptionalCatalogId = (
  catalogId: string | null | undefined
): string | undefined => {
  const trimmedCatalogId = toTrimmedString(catalogId);
  return trimmedCatalogId.length > 0 ? trimmedCatalogId : undefined;
};

export const hasCatalogId = (catalogId: string | null | undefined): boolean =>
  toOptionalCatalogId(catalogId) !== undefined;

export const createEmptyShippingGroupFormData = (
  catalogId: string
): ShippingGroupFormData => ({
  name: '',
  description: '',
  catalogId,
  traderaShippingCondition: '',
  traderaShippingPriceEur: '',
  autoAssignCategoryIds: [],
  autoAssignCurrencyCodes: [],
});

export const createShippingGroupFormData = (
  shippingGroup: ProductShippingGroup
): ShippingGroupFormData => ({
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

export const buildCatalogOptions = (
  catalogs: readonly Catalog[]
): Array<LabeledOptionDto<string>> =>
  catalogs.map((catalog: Catalog) => ({
    value: catalog.id,
    label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`,
  }));

const toNullableTrimmedString = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const parseOptionalShippingPrice = (value: string): number | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? Number(trimmedValue) : null;
};

export const getRequiredShippingGroupFormError = (
  formData: ShippingGroupFormData
): string | null => {
  if (formData.name.trim().length === 0) {
    return 'Shipping group name is required.';
  }

  if (formData.catalogId.trim().length === 0) {
    return 'Catalog is required.';
  }

  return null;
};

export const getShippingPriceFormError = (shippingPrice: string): string | null => {
  const trimmedShippingPrice = shippingPrice.trim();
  if (trimmedShippingPrice.length === 0) {
    return null;
  }

  const parsedShippingPrice = Number(trimmedShippingPrice);
  return !Number.isFinite(parsedShippingPrice) || parsedShippingPrice < 0
    ? 'Tradera shipping price must be a non-negative EUR amount.'
    : null;
};

export const buildShippingGroupMutationData = ({
  formData,
  normalizedRuleIds,
}: {
  formData: ShippingGroupFormData;
  normalizedRuleIds: readonly string[];
}): Partial<ProductShippingGroup> => ({
  name: formData.name.trim(),
  description: toNullableTrimmedString(formData.description),
  catalogId: formData.catalogId,
  traderaShippingCondition: toNullableTrimmedString(formData.traderaShippingCondition),
  traderaShippingPriceEur: parseOptionalShippingPrice(formData.traderaShippingPriceEur),
  autoAssignCategoryIds: [...normalizedRuleIds],
  autoAssignCurrencyCodes: formData.autoAssignCurrencyCodes,
});

export const getShippingGroupSaveValidationError = ({
  formData,
  conflicts,
  categoryLabelById,
  editingShippingGroupId,
}: {
  formData: ShippingGroupFormData;
  conflicts: readonly ShippingGroupRuleConflict[];
  categoryLabelById: Map<string, string>;
  editingShippingGroupId: string | undefined;
}): string | null => {
  const requiredError = getRequiredShippingGroupFormError(formData);
  if (requiredError !== null) return requiredError;

  const shippingPriceError = getShippingPriceFormError(formData.traderaShippingPriceEur);
  if (shippingPriceError !== null) return shippingPriceError;

  if (conflicts.length === 0) return null;

  return formatShippingGroupConflictMessage({
    conflicts,
    categoryLabelById,
    draftShippingGroupId: editingShippingGroupId ?? DRAFT_SHIPPING_GROUP_ID,
  });
};

export const resolveShippingGroupSaveErrorMessage = ({
  error,
  categoryLabelById,
  editingShippingGroupId,
}: {
  error: unknown;
  categoryLabelById: Map<string, string>;
  editingShippingGroupId: string | undefined;
}): string => {
  const conflictMeta = readConflictMetaFromApiError(error);
  if (conflictMeta.length > 0) {
    return formatShippingGroupConflictMessage({
      conflicts: conflictMeta,
      categoryLabelById,
      draftShippingGroupId: editingShippingGroupId ?? DRAFT_SHIPPING_GROUP_ID,
    });
  }

  return error instanceof Error ? error.message : 'Failed to save shipping group.';
};

export const getCategoryAvailabilityMessage = (categoryCount: number): string => {
  if (categoryCount === 0) {
    return 'No categories are available in this catalog yet.';
  }

  if (categoryCount === 1) {
    return '1 category is available in this catalog. You can still attach multiple categories once more categories exist.';
  }

  return `${categoryCount} categories are available in this catalog. You can attach more than one category to the same shipping group.`;
};

export const getMissingRuleSummary = (
  categoryIds: readonly string[],
  categoryLabelById: Map<string, string>
): string | null => {
  const missingRuleIds = categoryIds
    .map((categoryId) => toTrimmedString(categoryId))
    .filter((categoryId) => categoryId.length > 0 && !categoryLabelById.has(categoryId));
  return missingRuleIds.length > 0 ? missingRuleIds.join(', ') : null;
};

export const hasNormalizedRuleChanges = ({
  rawCategoryIds,
  normalizedCategoryIds,
}: {
  rawCategoryIds: readonly string[];
  normalizedCategoryIds: readonly string[];
}): boolean => {
  const rawRuleIds = rawCategoryIds
    .map((categoryId) => toTrimmedString(categoryId))
    .filter((categoryId) => categoryId.length > 0);
  if (rawRuleIds.length !== normalizedCategoryIds.length) return true;
  return rawRuleIds.some((categoryId, index) => categoryId !== normalizedCategoryIds[index]);
};
