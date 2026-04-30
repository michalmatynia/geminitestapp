import type {
  ProductListRowVisualsContextType,
} from '@/features/products/context/ProductListContext';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import {
  calculatePriceForCurrency,
  normalizeCurrencyCode,
} from '@/shared/lib/products/utils/priceCalculation';

import {
  getProductListDisplayName,
  hasEnglishProductDescription,
  hasEnglishProductTitle,
  hasFilledMarketplaceCopy,
  hasPolishProductDescription,
  hasPolishProductTitle,
  isUnassignedProductCategoryLabel,
  resolveProductCategoryLabel,
  resolveProductImportSource,
} from './columns/product-column-utils';
import type { ProductListMobileCardModel } from './ProductListMobileCards.types';
import {
  EMPTY_PRODUCT_LIST_VALUE,
  formatDateLabel,
  joinNonEmptyLabels,
  resolveThumbnailUrl,
  toTrimmedText,
} from './ProductListMobileCards.utils';

type ProductListMobileCardModelInput = {
  product: ProductWithImages;
  rowVisuals: ProductListRowVisualsContextType;
};

type ProductListSkuModel = Pick<
  ProductListMobileCardModel,
  'skuLabel' | 'duplicateSkuCount' | 'duplicateSkuTitle'
>;

type ProductListShippingModel = Pick<
  ProductListMobileCardModel,
  | 'autoShippingGroupLabel'
  | 'autoShippingRuleLabel'
  | 'shippingRuleConflictLabel'
  | 'missingManualShippingLabel'
>;

type ProductListPriceModel = Pick<
  ProductListMobileCardModel,
  | 'baseCurrencyCode'
  | 'hasConvertedPrice'
  | 'showCurrencyIndicator'
  | 'currencyCode'
  | 'formattedPrice'
  | 'basePriceLabel'
>;

const resolveSkuModel = (product: ProductWithImages): ProductListSkuModel => {
  const sku = toTrimmedText(product.sku);
  const duplicateSkuCount =
    typeof product.duplicateSkuCount === 'number' && product.duplicateSkuCount > 1
      ? product.duplicateSkuCount
      : null;

  return {
    skuLabel: sku.length > 0 ? sku : 'No SKU',
    duplicateSkuCount,
    duplicateSkuTitle:
      duplicateSkuCount !== null ? `SKU used by ${duplicateSkuCount} products` : null,
  };
};

const resolveAutoShippingRuleLabel = (
  product: ProductWithImages,
  rowVisuals: ProductListRowVisualsContextType
): string => {
  if (product.shippingGroupSource !== 'category_rule') return '';
  return joinNonEmptyLabels(
    (product.shippingGroupMatchedCategoryRuleIds ?? []).map(
      (categoryId) => rowVisuals.categoryNameById.get(categoryId) ?? categoryId
    )
  );
};

const resolveShippingModel = ({
  product,
  rowVisuals,
}: ProductListMobileCardModelInput): ProductListShippingModel => {
  const autoShippingGroupLabel =
    product.shippingGroupSource === 'category_rule'
      ? toTrimmedText(product.shippingGroup?.name)
      : '';

  return {
    autoShippingGroupLabel,
    autoShippingRuleLabel: resolveAutoShippingRuleLabel(product, rowVisuals),
    shippingRuleConflictLabel:
      product.shippingGroupResolutionReason === 'multiple_category_rules'
        ? joinNonEmptyLabels(product.shippingGroupMatchingGroupNames ?? [])
        : '',
    missingManualShippingLabel:
      product.shippingGroupResolutionReason === 'manual_missing'
        ? toTrimmedText(product.shippingGroupId)
        : '',
  };
};

const resolveFormattedPrice = (
  displayPrice: number | null,
  currencyLabel: string
): string => {
  if (displayPrice === null) return EMPTY_PRODUCT_LIST_VALUE;
  return `${displayPrice.toFixed(2)}${currencyLabel.length > 0 ? ` ${currencyLabel}` : ''}`;
};

const resolvePriceModel = ({
  product,
  rowVisuals,
}: ProductListMobileCardModelInput): ProductListPriceModel => {
  const result = calculatePriceForCurrency(
    product.price,
    product.defaultPriceGroupId,
    rowVisuals.currencyCode,
    rowVisuals.priceGroups,
    { sourcePrice: product.sourcePrice ?? null }
  );
  const normalizedBaseCurrencyCode = normalizeCurrencyCode(result.baseCurrencyCode);
  const normalizedSelectedCurrencyCode = normalizeCurrencyCode(rowVisuals.currencyCode);

  return {
    baseCurrencyCode: result.baseCurrencyCode,
    hasConvertedPrice:
      result.price !== null &&
      product.price !== null &&
      normalizedBaseCurrencyCode !== normalizedSelectedCurrencyCode &&
      result.price !== product.price,
    showCurrencyIndicator:
      result.currencyCode.length > 0 && result.currencyCode !== rowVisuals.currencyCode,
    currencyCode: rowVisuals.currencyCode,
    formattedPrice: resolveFormattedPrice(result.price, result.currencyCode),
    basePriceLabel:
      product.price !== null ? product.price.toFixed(2) : EMPTY_PRODUCT_LIST_VALUE,
  };
};

export const resolveProductListMobileCardModel = ({
  product,
  rowVisuals,
}: ProductListMobileCardModelInput): ProductListMobileCardModel => {
  const nameValue = getProductListDisplayName(product, rowVisuals.productNameKey);
  const importSource = resolveProductImportSource(product);
  const categoryLabel = resolveProductCategoryLabel(
    product,
    rowVisuals.categoryNameById,
    rowVisuals.productNameKey
  );
  const copyStatus = {
    hasMarketplaceCopy: hasFilledMarketplaceCopy(product),
    hasEnglishTitle: hasEnglishProductTitle(product),
    hasEnglishDescription: hasEnglishProductDescription(product),
    hasPolishTitle: hasPolishProductTitle(product),
    hasPolishDescription: hasPolishProductDescription(product),
  };

  return {
    nameValue,
    displayName: nameValue.length > 0 ? nameValue : EMPTY_PRODUCT_LIST_VALUE,
    selectionLabel: nameValue.length > 0 ? nameValue : 'product',
    importSource,
    ...copyStatus,
    hasStatusIcons:
      importSource !== null ||
      copyStatus.hasMarketplaceCopy ||
      copyStatus.hasEnglishTitle ||
      copyStatus.hasEnglishDescription ||
      copyStatus.hasPolishTitle ||
      copyStatus.hasPolishDescription,
    ...resolveSkuModel(product),
    categoryLabel,
    categoryIsUnassigned: isUnassignedProductCategoryLabel(categoryLabel),
    ...resolveShippingModel({ product, rowVisuals }),
    thumbnailUrl: resolveThumbnailUrl(
      product,
      rowVisuals.thumbnailSource,
      rowVisuals.imageExternalBaseUrl
    ),
    createdAtLabel: formatDateLabel(product.createdAt),
    ...resolvePriceModel({ product, rowVisuals }),
  };
};
