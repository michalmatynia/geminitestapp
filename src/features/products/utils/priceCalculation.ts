import type { PriceGroupForCalculation } from "@/features/products/types";

function normalizeCurrencyCode(code?: string | null): string {
  return (code ?? "").trim().toUpperCase();
}

function getGroupCurrencyCode(group: PriceGroupForCalculation): string {
  return normalizeCurrencyCode(
    group.currency?.code ||
      group.currencyCode ||
      (typeof group.currencyId === "string" ? group.currencyId : undefined) ||
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
      : undefined) ?? priceGroups.find((g: PriceGroupForCalculation): boolean => !!g.isDefault) ?? priceGroups[0];

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
    id ? priceGroups.find((g: PriceGroupForCalculation): boolean => g.id === id || g.groupId === id) : undefined;

  const resolvePriceForGroup = (
    group: PriceGroupForCalculation | undefined,
    visited: Set<string> = new Set<string>()
  ): number | null => {
    if (!group) return null;
    const key: string | undefined = group.id || group.groupId;
    if (key) {
      if (visited.has(key)) return null;
      visited.add(key);
    }

    if (group.id === defaultGroup.id || group.groupId === defaultGroup.groupId) {
      return basePrice;
    }

    if (group.type === "standard") {
      const multiplier: number = Number.isFinite(group.priceMultiplier) ? group.priceMultiplier : 1;
      const addToPrice: number = Number.isFinite(group.addToPrice) ? group.addToPrice : 0;
      return basePrice * multiplier + addToPrice;
    }

    if (group.type === "dependent" && group.sourceGroupId) {
      const source: PriceGroupForCalculation | undefined = findGroupById(group.sourceGroupId);
      const sourcePrice: number | null = resolvePriceForGroup(source, visited);
      if (sourcePrice === null) return null;
      const multiplier: number = Number.isFinite(group.priceMultiplier) ? group.priceMultiplier : 1;
      const addToPrice: number = Number.isFinite(group.addToPrice) ? group.addToPrice : 0;
      return sourcePrice * multiplier + addToPrice;
    }

    return null;
  };

  const targetCandidates: PriceGroupForCalculation[] = priceGroups.filter(
    (group: PriceGroupForCalculation): boolean => {
      const groupCode: string = getGroupCurrencyCode(group);
      const groupIdCode = normalizeCurrencyCode(group.groupId);
      const currencyIdCode =
        typeof group.currencyId === "string" ? normalizeCurrencyCode(group.currencyId) : "";
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
