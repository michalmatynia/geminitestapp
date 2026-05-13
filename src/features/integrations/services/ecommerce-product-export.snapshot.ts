import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { EcommerceExportShippingGroupContext } from './ecommerce-product-export.enrichment';

export type EcommerceProductPricingFields = {
  defaultPriceGroupId: string | null;
  price: number | null;
  priceCurrencyCode: string | null;
  sourcePrice: number | null;
  sourcePriceCurrencyCode: string | null;
};

export type EcommerceProductShippingFields = EcommerceExportShippingGroupContext;

const nullableString = (value: string | null | undefined): string | null => {
  if (value === undefined) return null;
  return value;
};

const nullableNumber = (value: number | null | undefined): number | null => {
  if (value === undefined) return null;
  return value;
};

const firstNullableNumber = (...values: Array<number | null | undefined>): number | null => {
  for (const value of values) {
    const normalized = nullableNumber(value);
    if (normalized !== null) return normalized;
  }
  return null;
};

const hasShippingGroupContext = (
  shippingGroup: EcommerceExportShippingGroupContext | null | undefined
): shippingGroup is EcommerceExportShippingGroupContext =>
  shippingGroup !== null && shippingGroup !== undefined;

const optionalStringList = (values: string[] | undefined): string[] => values ?? [];

type ShippingGroupListField = keyof Pick<
  EcommerceExportShippingGroupContext,
  | 'shippingGroupAutoAssignCategoryIds'
  | 'shippingGroupAutoAssignCurrencyCodes'
  | 'shippingGroupMatchedCategoryRuleIds'
>;

type ShippingGroupStringField = keyof Omit<
  EcommerceExportShippingGroupContext,
  ShippingGroupListField | 'shippingGroupTraderaShippingPriceEur'
>;

const resolveShippingString = (
  shippingGroup: EcommerceExportShippingGroupContext | null | undefined,
  field: ShippingGroupStringField,
  fallback: string | null
): string | null => {
  if (!hasShippingGroupContext(shippingGroup)) return fallback;
  return shippingGroup[field] ?? fallback;
};

const resolveShippingList = (
  shippingGroup: EcommerceExportShippingGroupContext | null | undefined,
  field: ShippingGroupListField,
  fallback: string[]
): string[] => {
  if (!hasShippingGroupContext(shippingGroup)) return fallback;
  return shippingGroup[field];
};

const resolveProductShippingGroupName = (product: ProductWithImages): string | null => {
  if (product.shippingGroup === undefined) return null;
  return product.shippingGroup.name;
};

const resolveProductShippingGroupCondition = (product: ProductWithImages): string | null => {
  if (product.shippingGroup === undefined) return null;
  return product.shippingGroup.traderaShippingCondition ?? null;
};

const resolveProductShippingGroupPrice = (product: ProductWithImages): number | null => {
  if (product.shippingGroup === undefined) return null;
  return product.shippingGroup.traderaShippingPriceEur ?? null;
};

const resolveShippingPrice = (
  shippingGroup: EcommerceExportShippingGroupContext | null | undefined,
  product: ProductWithImages
): number | null => {
  if (!hasShippingGroupContext(shippingGroup)) return resolveProductShippingGroupPrice(product);
  return shippingGroup.shippingGroupTraderaShippingPriceEur ?? resolveProductShippingGroupPrice(product);
};

export const buildPricingSnapshot = (
  product: ProductWithImages
): EcommerceProductPricingFields => ({
  defaultPriceGroupId: nullableString(product.defaultPriceGroupId),
  price: nullableNumber(product.price),
  priceCurrencyCode: null,
  sourcePrice: firstNullableNumber(product.sourcePrice, product.price),
  sourcePriceCurrencyCode: nullableString(product.sourcePriceCurrencyCode),
});

export const buildShippingGroupSnapshot = (
  product: ProductWithImages,
  shippingGroup: EcommerceExportShippingGroupContext | null | undefined
): EcommerceProductShippingFields => ({
  shippingGroupAutoAssignCategoryIds: resolveShippingList(
    shippingGroup,
    'shippingGroupAutoAssignCategoryIds',
    []
  ),
  shippingGroupAutoAssignCurrencyCodes: resolveShippingList(
    shippingGroup,
    'shippingGroupAutoAssignCurrencyCodes',
    []
  ),
  shippingGroupCatalogId: resolveShippingString(shippingGroup, 'shippingGroupCatalogId', null),
  shippingGroupDescription: resolveShippingString(
    shippingGroup,
    'shippingGroupDescription',
    null
  ),
  shippingGroupId: resolveShippingString(
    shippingGroup,
    'shippingGroupId',
    nullableString(product.shippingGroupId)
  ),
  shippingGroupMatchedCategoryRuleIds: resolveShippingList(
    shippingGroup,
    'shippingGroupMatchedCategoryRuleIds',
    optionalStringList(product.shippingGroupMatchedCategoryRuleIds)
  ),
  shippingGroupName: resolveShippingString(
    shippingGroup,
    'shippingGroupName',
    resolveProductShippingGroupName(product)
  ),
  shippingGroupResolutionReason: resolveShippingString(
    shippingGroup,
    'shippingGroupResolutionReason',
    product.shippingGroupResolutionReason ?? null
  ),
  shippingGroupSource: resolveShippingString(
    shippingGroup,
    'shippingGroupSource',
    product.shippingGroupSource ?? null
  ),
  shippingGroupTraderaShippingCondition: resolveShippingString(
    shippingGroup,
    'shippingGroupTraderaShippingCondition',
    resolveProductShippingGroupCondition(product)
  ),
  shippingGroupTraderaShippingPriceEur: resolveShippingPrice(shippingGroup, product),
});
