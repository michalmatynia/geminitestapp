import 'server-only';

import type { ProductCreateInput, ProductUpdateInput } from '@/shared/contracts/products/io';
import type { PriceGroupForCalculation } from '@/shared/contracts/products/product';
import { calculatePriceForCurrency } from '@/shared/lib/products/utils/priceCalculation';

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';

type BuildCalculatedImportedPriceInput = {
  candidate: ProductScrapeCandidate;
  catalogDefaultPriceGroupId: string | null;
  priceGroups: PriceGroupForCalculation[];
  sourcePriceCurrencyCode: string;
  templatePrice: number | null | undefined;
  templateDefaultPriceGroupId: string | null | undefined;
};

const hasTemplateNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const hasTemplateString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const resolveDefaultPriceGroupId = ({
  catalogDefaultPriceGroupId,
  templateDefaultPriceGroupId,
}: Pick<
  BuildCalculatedImportedPriceInput,
  'catalogDefaultPriceGroupId' | 'templateDefaultPriceGroupId'
>): string | null => {
  if (hasTemplateString(templateDefaultPriceGroupId)) return templateDefaultPriceGroupId;
  if (hasTemplateString(catalogDefaultPriceGroupId)) return catalogDefaultPriceGroupId;
  return null;
};

const matchesPriceGroupId = (group: PriceGroupForCalculation, id: string): boolean =>
  group.id === id || group.groupId === id;

const resolvePriceGroupCurrencyCode = (group: PriceGroupForCalculation): string => {
  const currencyCode = group.currency.code.trim();
  if (currencyCode.length > 0) return currencyCode;
  if (typeof group.currencyCode === 'string' && group.currencyCode.trim().length > 0) {
    return group.currencyCode.trim();
  }
  return group.currencyId.trim();
};

export const buildCalculatedImportedPrice = ({
  candidate,
  catalogDefaultPriceGroupId,
  priceGroups,
  sourcePriceCurrencyCode,
  templateDefaultPriceGroupId,
  templatePrice,
}: BuildCalculatedImportedPriceInput): Partial<ProductCreateInput & ProductUpdateInput> => {
  if (hasTemplateNumber(templatePrice) || candidate.price === null) return {};

  const defaultPriceGroupId = resolveDefaultPriceGroupId({
    catalogDefaultPriceGroupId,
    templateDefaultPriceGroupId,
  });
  if (defaultPriceGroupId === null) return {};

  const defaultGroup = priceGroups.find((group) => matchesPriceGroupId(group, defaultPriceGroupId));
  if (defaultGroup === undefined) return {};

  const targetCurrencyCode = resolvePriceGroupCurrencyCode(defaultGroup);
  if (targetCurrencyCode.length === 0) return {};

  const result = calculatePriceForCurrency(null, defaultPriceGroupId, targetCurrencyCode, priceGroups, {
    sourcePrice: candidate.price,
    sourcePriceCurrencyCode,
  });
  return result.price !== null ? { price: result.price } : {};
};
