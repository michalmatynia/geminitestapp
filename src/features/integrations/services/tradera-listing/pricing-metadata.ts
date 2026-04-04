import type { TraderaListingPriceResolution } from './price';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toTrimmedStringOrNull = (value: unknown): string | null => {
  const trimmed = toTrimmedString(value);
  return trimmed || null;
};

const toNormalizedIdentifierArray = (value: unknown): string[] =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );

export type TraderaPricingMetadata<TKey extends string = 'pricingCatalogId'> = {
  listingPrice: number | null;
  listingCurrencyCode: string;
  targetCurrencyCode: string;
  resolvedToTargetCurrency: boolean;
  basePrice: number | null;
  baseCurrencyCode: string | null;
  priceSource: string;
  priceResolutionReason: string;
  defaultPriceGroupId: string | null;
  catalogDefaultPriceGroupId: string | null;
  catalogPriceGroupIds: string[];
  loadedPriceGroupIds: string[];
  matchedTargetPriceGroupIds: string[];
} & Record<TKey, string | null>;

export const buildTraderaPricingMetadata = <TKey extends string = 'pricingCatalogId'>(
  pricingResolution: TraderaListingPriceResolution,
  options?: { catalogIdKey?: TKey }
): TraderaPricingMetadata<TKey> => {
  const catalogIdKey = (options?.catalogIdKey ?? 'pricingCatalogId') as TKey;

  return {
    listingPrice: pricingResolution.listingPrice,
    listingCurrencyCode: pricingResolution.listingCurrencyCode,
    targetCurrencyCode: pricingResolution.targetCurrencyCode,
    resolvedToTargetCurrency: pricingResolution.resolvedToTargetCurrency,
    basePrice: pricingResolution.basePrice,
    baseCurrencyCode: pricingResolution.baseCurrencyCode,
    priceSource: pricingResolution.priceSource,
    priceResolutionReason: pricingResolution.reason,
    defaultPriceGroupId: toTrimmedStringOrNull(pricingResolution.defaultPriceGroupId),
    catalogDefaultPriceGroupId: toTrimmedStringOrNull(pricingResolution.catalogDefaultPriceGroupId),
    [catalogIdKey]: toTrimmedStringOrNull(pricingResolution.catalogId),
    catalogPriceGroupIds: toNormalizedIdentifierArray(pricingResolution.catalogPriceGroupIds),
    loadedPriceGroupIds: toNormalizedIdentifierArray(pricingResolution.loadedPriceGroupIds),
    matchedTargetPriceGroupIds: toNormalizedIdentifierArray(
      pricingResolution.matchedTargetPriceGroupIds
    ),
  } as TraderaPricingMetadata<TKey>;
};
