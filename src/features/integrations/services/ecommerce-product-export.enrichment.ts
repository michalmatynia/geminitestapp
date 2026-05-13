import 'server-only';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import { getShippingGroupRepository } from '@/shared/lib/products/services/shipping-group-repository';

export type EcommerceExportShippingGroupContext = {
  shippingGroupAutoAssignCategoryIds: string[];
  shippingGroupAutoAssignCurrencyCodes: string[];
  shippingGroupCatalogId: string | null;
  shippingGroupDescription: string | null;
  shippingGroupId: string | null;
  shippingGroupMatchedCategoryRuleIds: string[];
  shippingGroupName: string | null;
  shippingGroupResolutionReason: string | null;
  shippingGroupSource: string | null;
  shippingGroupTraderaShippingCondition: string | null;
  shippingGroupTraderaShippingPriceEur: number | null;
};

export type EcommerceProductExportEnrichment = {
  shippingGroup: EcommerceExportShippingGroupContext | null;
};

const trimString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toNullableString = (value: unknown): string | null => {
  const trimmed = trimString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const toNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map(toNullableString).filter((entry): entry is string => entry !== null)
    : [];

const firstNonEmptyString = (...values: unknown[]): string => {
  for (const value of values) {
    const trimmed = trimString(value);
    if (trimmed.length > 0) return trimmed;
  }
  return '';
};

const firstNullableString = (...values: unknown[]): string | null => {
  const value = firstNonEmptyString(...values);
  return value.length > 0 ? value : null;
};

const resolveShippingGroupId = (
  group: ProductShippingGroup | null,
  product: ProductWithImages
): string | null => {
  if (group === null) return toNullableString(product.shippingGroupId);
  return firstNullableString(group.id, product.shippingGroupId);
};

const getShippingGroupDescription = (group: ProductShippingGroup | null): string | null => {
  if (group === null) return null;
  return toNullableString(group.description);
};

const getShippingGroupCatalogId = (group: ProductShippingGroup | null): string | null => {
  if (group === null) return null;
  return toNullableString(group.catalogId);
};

const getShippingGroupName = (group: ProductShippingGroup | null): string | null => {
  if (group === null) return null;
  return toNullableString(group.name);
};

const getShippingGroupCondition = (group: ProductShippingGroup | null): string | null => {
  if (group === null) return null;
  return toNullableString(group.traderaShippingCondition);
};

const getShippingGroupPrice = (group: ProductShippingGroup | null): number | null => {
  if (group === null) return null;
  return toNullableNumber(group.traderaShippingPriceEur);
};

const getShippingGroupCategoryIds = (group: ProductShippingGroup | null): string[] => {
  if (group === null) return [];
  return toStringList(group.autoAssignCategoryIds);
};

const getShippingGroupCurrencyCodes = (group: ProductShippingGroup | null): string[] => {
  if (group === null) return [];
  return toStringList(group.autoAssignCurrencyCodes);
};

const shippingGroupToContext = ({
  group,
  product,
  reason,
  source,
}: {
  group: ProductShippingGroup | null;
  product: ProductWithImages;
  reason: string | null;
  source: string | null;
}): EcommerceExportShippingGroupContext | null => {
  const shippingGroupId = resolveShippingGroupId(group, product);
  if (shippingGroupId === null) return null;
  return {
    shippingGroupAutoAssignCategoryIds: getShippingGroupCategoryIds(group),
    shippingGroupAutoAssignCurrencyCodes: getShippingGroupCurrencyCodes(group),
    shippingGroupCatalogId: getShippingGroupCatalogId(group),
    shippingGroupDescription: getShippingGroupDescription(group),
    shippingGroupId,
    shippingGroupMatchedCategoryRuleIds: toStringList(product.shippingGroupMatchedCategoryRuleIds),
    shippingGroupName: getShippingGroupName(group),
    shippingGroupResolutionReason: reason,
    shippingGroupSource: source,
    shippingGroupTraderaShippingCondition: getShippingGroupCondition(group),
    shippingGroupTraderaShippingPriceEur: getShippingGroupPrice(group),
  };
};

export const resolveEcommerceProductShippingGroupContext = async (
  product: ProductWithImages
): Promise<EcommerceExportShippingGroupContext | null> => {
  if (product.shippingGroup !== undefined) {
    return shippingGroupToContext({
      group: product.shippingGroup,
      product,
      reason: product.shippingGroupResolutionReason ?? null,
      source: product.shippingGroupSource ?? null,
    });
  }

  const shippingGroupId = toNullableString(product.shippingGroupId);
  if (shippingGroupId === null) return null;
  const shippingGroupRepository = await getShippingGroupRepository();
  const shippingGroup = await shippingGroupRepository.getShippingGroupById(shippingGroupId);
  return shippingGroupToContext({
    group: shippingGroup,
    product,
    reason: shippingGroup === null ? 'manual_missing' : 'manual',
    source: 'manual',
  });
};

export const resolveEcommerceProductExportEnrichment = async (
  product: ProductWithImages
): Promise<EcommerceProductExportEnrichment> => {
  const shippingGroup = await resolveEcommerceProductShippingGroupContext(product);
  return { shippingGroup };
};
