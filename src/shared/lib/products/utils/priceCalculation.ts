import type { PriceGroupForCalculation } from '@/shared/contracts/products/product';
import { PRICE_GROUP_SOURCE_PRICE_FIELD } from '@/shared/contracts/products/catalogs';

type PriceCalculationOptions = {
  sourcePrice?: number | null | undefined;
};

type CalculatePriceForCurrencyArgs =
  | [
      basePrice: number | null,
      defaultPriceGroupId: string | null,
      targetCurrencyCode: string,
      priceGroups: PriceGroupForCalculation[],
    ]
  | [
      basePrice: number | null,
      defaultPriceGroupId: string | null,
      targetCurrencyCode: string,
      priceGroups: PriceGroupForCalculation[],
      options: PriceCalculationOptions,
    ];

type ProductPriceSources = {
  basePrice: number | null;
  sourcePrice: number | null;
};

function normalizeCurrencyCode(code?: string | null): string {
  return (code ?? '').trim().toUpperCase();
}

const normalizePriceGroupIdentifier = (value?: string | null): string => (value ?? '').trim();

const toFinitePrice = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const firstNonEmptyString = (values: Array<string | null | undefined>): string => {
  for (const value of values) {
    const normalized = normalizePriceGroupIdentifier(value);
    if (normalized.length > 0) return normalized;
  }
  return '';
};

const getPriceGroupKey = (group: PriceGroupForCalculation | undefined): string | null => {
  if (group === undefined) return null;
  const key = firstNonEmptyString([group.id, group.groupId]);
  return key.length > 0 ? key : null;
};

const findPriceGroupById = (
  priceGroups: PriceGroupForCalculation[],
  id?: string | null
): PriceGroupForCalculation | undefined => {
  const normalizedId = normalizePriceGroupIdentifier(id);
  if (normalizedId.length === 0) return undefined;
  return priceGroups.find(
    (group: PriceGroupForCalculation): boolean =>
      group.id === normalizedId || group.groupId === normalizedId
  );
};

const isSamePriceGroup = (
  left: PriceGroupForCalculation | undefined,
  right: PriceGroupForCalculation | undefined
): boolean => {
  if (left === undefined || right === undefined) {
    return false;
  }

  const leftId = normalizePriceGroupIdentifier(left.id);
  const rightId = normalizePriceGroupIdentifier(right.id);
  if (leftId.length > 0 && rightId.length > 0 && leftId === rightId) {
    return true;
  }

  const leftGroupId = normalizePriceGroupIdentifier(left.groupId);
  const rightGroupId = normalizePriceGroupIdentifier(right.groupId);
  return leftGroupId.length > 0 && rightGroupId.length > 0 && leftGroupId === rightGroupId;
};

const resolvePriceGroupAdjustment = (
  group: PriceGroupForCalculation
): { multiplier: number; addToPrice: number } => ({
  multiplier: Number.isFinite(group.priceMultiplier) ? group.priceMultiplier : 1,
  addToPrice: Number.isFinite(group.addToPrice) ? group.addToPrice : 0,
});

const applyPriceGroupAdjustment = (
  price: number,
  group: PriceGroupForCalculation
): number => {
  const { multiplier, addToPrice } = resolvePriceGroupAdjustment(group);
  return price * multiplier + addToPrice;
};

const resolveProductFieldPrice = (
  group: PriceGroupForCalculation,
  prices: ProductPriceSources
): number | null => {
  if (group.basePriceField === PRICE_GROUP_SOURCE_PRICE_FIELD) return prices.sourcePrice;
  return prices.basePrice;
};

const markVisitedPriceGroup = (
  group: PriceGroupForCalculation,
  visited: Set<string>
): boolean => {
  const key = getPriceGroupKey(group);
  if (key === null) return true;
  if (visited.has(key)) return false;
  visited.add(key);
  return true;
};

function getGroupCurrencyCode(group: PriceGroupForCalculation): string {
  const currency = (group as { currency?: { code?: string | null } }).currency;
  return normalizeCurrencyCode(
    firstNonEmptyString([
      currency?.code,
      group.currencyCode,
      typeof group.currencyId === 'string' ? group.currencyId : undefined,
      group.groupId,
    ])
  );
}

const matchesTargetCurrency = (
  group: PriceGroupForCalculation,
  normalizedTarget: string
): boolean => {
  const groupCode: string = getGroupCurrencyCode(group);
  const groupIdCode = normalizeCurrencyCode(group.groupId);
  const currencyIdCode =
    typeof group.currencyId === 'string' ? normalizeCurrencyCode(group.currencyId) : '';
  return (
    groupCode === normalizedTarget ||
    groupIdCode === normalizedTarget ||
    (currencyIdCode.length > 0 && currencyIdCode === normalizedTarget)
  );
};

type ResolvePriceForGroupInput = {
  group: PriceGroupForCalculation | undefined;
  defaultGroup: PriceGroupForCalculation;
  prices: ProductPriceSources;
  priceGroups: PriceGroupForCalculation[];
  visited?: Set<string>;
};

const resolveStandardPriceForGroup = (
  group: PriceGroupForCalculation,
  prices: ProductPriceSources
): number | null => {
  const productFieldPrice = resolveProductFieldPrice(group, prices);
  return productFieldPrice === null ? null : applyPriceGroupAdjustment(productFieldPrice, group);
};

const resolveDependentSourcePrice = (
  input: ResolvePriceForGroupInput,
  group: PriceGroupForCalculation,
  visited: Set<string>
): number | null => {
  const normalizedSourceGroupId =
    typeof group.sourceGroupId === 'string' ? group.sourceGroupId.trim() : '';
  if (normalizedSourceGroupId.length === 0) return resolveProductFieldPrice(group, input.prices);
  return resolvePriceForGroup({
    group: findPriceGroupById(input.priceGroups, normalizedSourceGroupId),
    defaultGroup: input.defaultGroup,
    prices: input.prices,
    priceGroups: input.priceGroups,
    visited,
  });
};

const resolveVisitedPriceForGroup = (
  input: ResolvePriceForGroupInput,
  group: PriceGroupForCalculation,
  visited: Set<string>
): number | null => {
  if (
    isSamePriceGroup(group, input.defaultGroup) &&
    group.type !== 'dependent' &&
    group.basePriceField !== PRICE_GROUP_SOURCE_PRICE_FIELD
  ) {
    return input.prices.basePrice;
  }
  if (group.type === 'standard') return resolveStandardPriceForGroup(group, input.prices);
  if (group.type !== 'dependent') return null;

  const sourcePrice = resolveDependentSourcePrice(input, group, visited);
  return sourcePrice === null ? null : applyPriceGroupAdjustment(sourcePrice, group);
};

const resolvePriceForGroup = (input: ResolvePriceForGroupInput): number | null => {
  const visited = input.visited ?? new Set<string>();
  const group = input.group;
  if (group === undefined) return null;
  if (!markVisitedPriceGroup(group, visited)) return null;
  return resolveVisitedPriceForGroup(input, group, visited);
};

const resolveDefaultPriceGroup = (
  defaultPriceGroupId: string | null,
  priceGroups: PriceGroupForCalculation[]
): PriceGroupForCalculation | undefined => {
  const normalizedDefaultGroupId = normalizePriceGroupIdentifier(defaultPriceGroupId);
  return (
    findPriceGroupById(priceGroups, normalizedDefaultGroupId) ??
    priceGroups.find((group: PriceGroupForCalculation): boolean => group.isDefault === true) ??
    priceGroups[0]
  );
};

const resolveTargetPrice = ({
  defaultGroup,
  normalizedTarget,
  prices,
  priceGroups,
}: {
  defaultGroup: PriceGroupForCalculation;
  normalizedTarget: string;
  prices: ProductPriceSources;
  priceGroups: PriceGroupForCalculation[];
}): number | null => {
  const targetCandidates = priceGroups.filter((group: PriceGroupForCalculation): boolean =>
    matchesTargetCurrency(group, normalizedTarget)
  );

  for (const candidate of targetCandidates) {
    const candidateResolved = resolvePriceForGroup({
      group: candidate,
      defaultGroup,
      prices,
      priceGroups,
    });
    if (candidateResolved !== null) return candidateResolved;
  }

  return null;
};

const buildPriceResult = ({
  price,
  currencyCode,
  baseCurrencyCode,
}: {
  price: number | null;
  currencyCode: string;
  baseCurrencyCode: string;
}): { price: number | null; currencyCode: string; baseCurrencyCode: string } => ({
  price,
  currencyCode,
  baseCurrencyCode,
});

const hasNoPriceInputs = (prices: ProductPriceSources): boolean =>
  prices.basePrice === null && prices.sourcePrice === null;

const resolveFallbackCurrencyCode = (baseCurrencyCode: string, fallback: string): string =>
  baseCurrencyCode.length > 0 ? baseCurrencyCode : fallback;

export { normalizeCurrencyCode };

export function calculatePriceForCurrency(
  ...args: CalculatePriceForCurrencyArgs
): { price: number | null; currencyCode: string; baseCurrencyCode: string } {
  const [basePrice, defaultPriceGroupId, targetCurrencyCode, priceGroups, options = {}] = args;
  const prices: ProductPriceSources = {
    basePrice: toFinitePrice(basePrice),
    sourcePrice: toFinitePrice(options.sourcePrice),
  };

  if (priceGroups.length === 0 || hasNoPriceInputs(prices)) {
    return buildPriceResult({
      price: null,
      currencyCode: targetCurrencyCode,
      baseCurrencyCode: normalizeCurrencyCode(targetCurrencyCode),
    });
  }

  const normalizedTarget: string = normalizeCurrencyCode(targetCurrencyCode);
  const defaultGroup = resolveDefaultPriceGroup(defaultPriceGroupId, priceGroups);
  if (defaultGroup === undefined) {
    return buildPriceResult({
      price: prices.basePrice,
      currencyCode: targetCurrencyCode,
      baseCurrencyCode: normalizedTarget,
    });
  }

  const baseCurrencyCode: string = getGroupCurrencyCode(defaultGroup);
  if (baseCurrencyCode.length > 0 && baseCurrencyCode === normalizedTarget) {
    const defaultGroupPrice = resolvePriceForGroup({
      group: defaultGroup,
      defaultGroup,
      prices,
      priceGroups,
    });
    return buildPriceResult({
      price: defaultGroupPrice,
      currencyCode: targetCurrencyCode,
      baseCurrencyCode,
    });
  }

  const resolved = resolveTargetPrice({ defaultGroup, normalizedTarget, prices, priceGroups });
  if (resolved !== null) {
    return buildPriceResult({ price: resolved, currencyCode: targetCurrencyCode, baseCurrencyCode });
  }

  return buildPriceResult({
    price: prices.basePrice,
    currencyCode: resolveFallbackCurrencyCode(baseCurrencyCode, targetCurrencyCode),
    baseCurrencyCode: resolveFallbackCurrencyCode(baseCurrencyCode, normalizedTarget),
  });
}
