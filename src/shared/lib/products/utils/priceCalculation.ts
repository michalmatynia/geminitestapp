import type { PriceGroupForCalculation } from '@/shared/contracts/products';

function normalizeCurrencyCode(code?: string | null): string {
  return (code ?? '').trim().toUpperCase();
}

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
  return left.id === right.id || left.groupId === right.groupId;
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
  basePrice: number;
  priceGroups: PriceGroupForCalculation[];
  visited?: Set<string>;
}): number | null => {
  const visited = input.visited ?? new Set<string>();
  const group = input.group;
  if (!group) return null;
  if (!markVisitedPriceGroup(group, visited)) return null;
  if (isSamePriceGroup(group, input.defaultGroup)) {
    return input.basePrice;
  }
  if (group.type === 'standard') {
    return applyPriceGroupAdjustment(input.basePrice, group);
  }
  if (group.type !== 'dependent' || !group.sourceGroupId) {
    return null;
  }
  const sourcePrice = resolvePriceForGroup({
    group: findPriceGroupById(input.priceGroups, group.sourceGroupId),
    defaultGroup: input.defaultGroup,
    basePrice: input.basePrice,
    priceGroups: input.priceGroups,
    visited,
  });
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

  const targetCandidates: PriceGroupForCalculation[] = priceGroups.filter(
    (group: PriceGroupForCalculation): boolean => matchesTargetCurrency(group, normalizedTarget)
  );

  let resolved: number | null = null;
  for (const candidate of targetCandidates) {
    const candidateResolved = resolvePriceForGroup({
      group: candidate,
      defaultGroup,
      basePrice,
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
    price: basePrice,
    currencyCode: baseCurrencyCode || targetCurrencyCode,
    baseCurrencyCode: baseCurrencyCode || normalizedTarget,
  };
}
