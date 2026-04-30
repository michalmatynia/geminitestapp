import type { PriceGroupForCalculation } from '@/shared/contracts/products/product';
import { PRICE_GROUP_SOURCE_PRICE_FIELD } from '@/shared/contracts/products/catalogs';

type PriceCalculationOptions = {
  sourcePrice?: number | null | undefined;
};

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

const getPriceGroupKey = (group: PriceGroupForCalculation | undefined): string | null =>
  group?.id || group?.groupId || null;

const findPriceGroupById = (
  priceGroups: PriceGroupForCalculation[],
  id?: string | null
): PriceGroupForCalculation | undefined =>
  id
    ? priceGroups.find((g: PriceGroupForCalculation): boolean => g.id === id || g.groupId === id)
    : undefined;

const isSamePriceGroup = (
  left: PriceGroupForCalculation | undefined,
  right: PriceGroupForCalculation | undefined
): boolean => {
  if (!left || !right) {
    return false;
  }

  const leftId = normalizePriceGroupIdentifier(left.id);
  const rightId = normalizePriceGroupIdentifier(right.id);
  if (leftId && rightId && leftId === rightId) {
    return true;
  }

  const leftGroupId = normalizePriceGroupIdentifier(left.groupId);
  const rightGroupId = normalizePriceGroupIdentifier(right.groupId);
  return Boolean(leftGroupId && rightGroupId && leftGroupId === rightGroupId);
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
  if (!key) return true;
  if (visited.has(key)) return false;
  visited.add(key);
  return true;
};

function getGroupCurrencyCode(group: PriceGroupForCalculation): string {
  return normalizeCurrencyCode(
    group.currency?.code ||
      group.currencyCode ||
      (typeof group.currencyId === 'string' ? group.currencyId : undefined) ||
      group.groupId
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
    Boolean(currencyIdCode && currencyIdCode === normalizedTarget)
  );
};

const resolvePriceForGroup = (input: {
  group: PriceGroupForCalculation | undefined;
  defaultGroup: PriceGroupForCalculation;
  prices: ProductPriceSources;
  priceGroups: PriceGroupForCalculation[];
  visited?: Set<string>;
}): number | null => {
  const visited = input.visited ?? new Set<string>();
  const group = input.group;
  if (!group) return null;
  if (!markVisitedPriceGroup(group, visited)) return null;
  if (isSamePriceGroup(group, input.defaultGroup) && group.type !== 'dependent') {
    return input.prices.basePrice;
  }
  if (group.type === 'standard') {
    const productFieldPrice = resolveProductFieldPrice(group, input.prices);
    return productFieldPrice === null ? null : applyPriceGroupAdjustment(productFieldPrice, group);
  }
  if (group.type !== 'dependent') {
    return null;
  }
  const normalizedSourceGroupId =
    typeof group.sourceGroupId === 'string' ? group.sourceGroupId.trim() : '';
  const sourcePrice =
    normalizedSourceGroupId.length > 0
      ? resolvePriceForGroup({
          group: findPriceGroupById(input.priceGroups, normalizedSourceGroupId),
          defaultGroup: input.defaultGroup,
          prices: input.prices,
          priceGroups: input.priceGroups,
          visited,
        })
      : resolveProductFieldPrice(group, input.prices);
  if (sourcePrice === null) {
    return null;
  }
  return applyPriceGroupAdjustment(sourcePrice, group);
};

export { normalizeCurrencyCode };

export function calculatePriceForCurrency(
  basePrice: number | null,
  defaultPriceGroupId: string | null,
  targetCurrencyCode: string,
  priceGroups: PriceGroupForCalculation[],
  options: PriceCalculationOptions = {}
): { price: number | null; currencyCode: string; baseCurrencyCode: string } {
  const prices: ProductPriceSources = {
    basePrice: toFinitePrice(basePrice),
    sourcePrice: toFinitePrice(options.sourcePrice),
  };

  if (!priceGroups.length || (prices.basePrice === null && prices.sourcePrice === null)) {
    return {
      price: null,
      currencyCode: targetCurrencyCode,
      baseCurrencyCode: normalizeCurrencyCode(targetCurrencyCode),
    };
  }

  const normalizedTarget: string = normalizeCurrencyCode(targetCurrencyCode);

  const defaultGroup: PriceGroupForCalculation | undefined =
    (defaultPriceGroupId
      ? priceGroups.find((g: PriceGroupForCalculation): boolean => g.id === defaultPriceGroupId)
      : undefined) ??
    priceGroups.find((g: PriceGroupForCalculation): boolean => Boolean(g.isDefault)) ??
    priceGroups[0];

  if (!defaultGroup) {
    return {
      price: basePrice,
      currencyCode: targetCurrencyCode,
      baseCurrencyCode: normalizedTarget,
    };
  }

  const baseCurrencyCode: string = getGroupCurrencyCode(defaultGroup);

  if (baseCurrencyCode && baseCurrencyCode === normalizedTarget) {
    const defaultGroupPrice = resolvePriceForGroup({
      group: defaultGroup,
      defaultGroup,
      prices,
      priceGroups,
    });
    return { price: defaultGroupPrice, currencyCode: targetCurrencyCode, baseCurrencyCode };
  }

  const targetCandidates: PriceGroupForCalculation[] = priceGroups.filter(
    (group: PriceGroupForCalculation): boolean => matchesTargetCurrency(group, normalizedTarget)
  );

  let resolved: number | null = null;
  for (const candidate of targetCandidates) {
    const candidateResolved = resolvePriceForGroup({
      group: candidate,
      defaultGroup,
      prices,
      priceGroups,
    });
    if (candidateResolved !== null) {
      resolved = candidateResolved;
      break;
    }
  }
  if (resolved !== null) {
    return { price: resolved, currencyCode: targetCurrencyCode, baseCurrencyCode };
  }

  return {
    price: prices.basePrice,
    currencyCode: baseCurrencyCode || targetCurrencyCode,
    baseCurrencyCode: baseCurrencyCode || normalizedTarget,
  };
}
