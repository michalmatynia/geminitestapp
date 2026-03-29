import type { PriceGroupForCalculation } from '@/shared/contracts/products';

function normalizeCurrencyCode(code?: string | null): string {
  return (code ?? '').trim().toUpperCase();
}

const getPriceGroupKey = (group: PriceGroupForCalculation | undefined): string | null =>
  group?.id || group?.groupId || null;

const isSamePriceGroup = (
  left: PriceGroupForCalculation | undefined,
  right: PriceGroupForCalculation | undefined
): boolean =>
  Boolean(left && right) && (left.id === right.id || left.groupId === right.groupId);

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

export { normalizeCurrencyCode };

export function calculatePriceForCurrency(
  basePrice: number | null,
  defaultPriceGroupId: string | null,
  targetCurrencyCode: string,
  priceGroups: PriceGroupForCalculation[]
): { price: number | null; currencyCode: string; baseCurrencyCode: string } {
  if (basePrice === null || !priceGroups.length) {
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
    priceGroups.find((g: PriceGroupForCalculation): boolean => !!g.isDefault) ??
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
    return { price: basePrice, currencyCode: targetCurrencyCode, baseCurrencyCode };
  }

  const findGroupById = (id?: string | null): PriceGroupForCalculation | undefined =>
    id
      ? priceGroups.find((g: PriceGroupForCalculation): boolean => g.id === id || g.groupId === id)
      : undefined;

  const resolvePriceForGroup = (
    group: PriceGroupForCalculation | undefined,
    visited: Set<string> = new Set<string>()
  ): number | null => {
    if (!group) return null;
    if (!markVisitedPriceGroup(group, visited)) return null;
    if (isSamePriceGroup(group, defaultGroup)) {
      return basePrice;
    }
    if (group.type === 'standard') return applyPriceGroupAdjustment(basePrice, group);
    if (group.type !== 'dependent' || !group.sourceGroupId) return null;
    const sourcePrice = resolvePriceForGroup(findGroupById(group.sourceGroupId), visited);
    if (sourcePrice === null) return null;
    return applyPriceGroupAdjustment(sourcePrice, group);
  };

  const targetCandidates: PriceGroupForCalculation[] = priceGroups.filter(
    (group: PriceGroupForCalculation): boolean => {
      const groupCode: string = getGroupCurrencyCode(group);
      const groupIdCode = normalizeCurrencyCode(group.groupId);
      const currencyIdCode =
        typeof group.currencyId === 'string' ? normalizeCurrencyCode(group.currencyId) : '';
      return (
        groupCode === normalizedTarget ||
        groupIdCode === normalizedTarget ||
        Boolean(currencyIdCode && currencyIdCode === normalizedTarget)
      );
    }
  );

  let resolved: number | null = null;
  for (const candidate of targetCandidates) {
    const candidateResolved = resolvePriceForGroup(candidate);
    if (candidateResolved !== null) {
      resolved = candidateResolved;
      break;
    }
  }
  if (resolved !== null) {
    return { price: resolved, currencyCode: targetCurrencyCode, baseCurrencyCode };
  }

  return {
    price: basePrice,
    currencyCode: baseCurrencyCode || targetCurrencyCode,
    baseCurrencyCode: baseCurrencyCode || normalizedTarget,
  };
}
