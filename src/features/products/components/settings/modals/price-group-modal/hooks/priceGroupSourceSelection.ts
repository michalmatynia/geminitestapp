import {
  PRICE_GROUP_SOURCE_PRICE_FIELD,
  type PriceGroup,
} from '@/shared/contracts/products/catalogs';

export const PRODUCT_SOURCE_PRICE_SOURCE_ID = '__product_source_price__';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

export const isProductSourcePriceSelected = (sourceGroupId: string): boolean =>
  sourceGroupId === PRODUCT_SOURCE_PRICE_SOURCE_ID;

export const normalizeSourceGroupId = (
  sourceGroupId: string | null | undefined,
  priceGroups: PriceGroup[]
): string => {
  const normalizedSourceGroupId = toTrimmedString(sourceGroupId);
  if (isProductSourcePriceSelected(normalizedSourceGroupId)) return PRODUCT_SOURCE_PRICE_SOURCE_ID;
  if (normalizedSourceGroupId.length === 0) return '';

  const matchingGroup = priceGroups.find((group) => {
    const groupId = toTrimmedString(group.id);
    const legacyGroupId = toTrimmedString(group.groupId);
    return normalizedSourceGroupId === groupId || normalizedSourceGroupId === legacyGroupId;
  });

  return matchingGroup !== undefined ? toTrimmedString(matchingGroup.id) : normalizedSourceGroupId;
};

export const resolveInitialSourceGroupId = (
  priceGroup: PriceGroup,
  priceGroups: PriceGroup[]
): string => {
  const normalizedSourceGroupId = normalizeSourceGroupId(priceGroup.sourceGroupId, priceGroups);
  if (normalizedSourceGroupId.length > 0) return normalizedSourceGroupId;
  if (
    priceGroup.type === 'dependent' &&
    priceGroup.basePriceField === PRICE_GROUP_SOURCE_PRICE_FIELD
  ) {
    return PRODUCT_SOURCE_PRICE_SOURCE_ID;
  }
  return '';
};

const addGroupIdentifier = (
  groupByIdentifier: Map<string, PriceGroup>,
  identifier: string,
  group: PriceGroup
): void => {
  if (identifier.length > 0) groupByIdentifier.set(identifier, group);
};

const buildGroupByIdentifier = (priceGroups: PriceGroup[]): Map<string, PriceGroup> => {
  const groupByIdentifier = new Map<string, PriceGroup>();
  priceGroups.forEach((group) => {
    addGroupIdentifier(groupByIdentifier, toTrimmedString(group.id), group);
    addGroupIdentifier(groupByIdentifier, toTrimmedString(group.groupId), group);
  });
  return groupByIdentifier;
};

const resolveSelfIdentifiers = (
  currentPriceGroup?: PriceGroup | null | undefined
): Set<string> =>
  new Set(
    [currentPriceGroup?.id, currentPriceGroup?.groupId]
      .map((value) => toTrimmedString(value))
      .filter(hasText)
  );

const hasCycleAtIdentifier = (
  currentIdentifier: string,
  selfIdentifiers: Set<string>,
  visited: Set<string>
): boolean => selfIdentifiers.has(currentIdentifier) || visited.has(currentIdentifier);

const walkSourceGroupChain = ({
  currentIdentifier,
  selfIdentifiers,
  groupByIdentifier,
}: {
  currentIdentifier: string;
  selfIdentifiers: Set<string>;
  groupByIdentifier: Map<string, PriceGroup>;
}): boolean => {
  const visited = new Set<string>();
  let activeIdentifier = currentIdentifier;

  while (activeIdentifier.length > 0) {
    if (hasCycleAtIdentifier(activeIdentifier, selfIdentifiers, visited)) return true;
    visited.add(activeIdentifier);
    const currentGroup = groupByIdentifier.get(activeIdentifier);
    activeIdentifier = toTrimmedString(currentGroup?.sourceGroupId);
  }

  return false;
};

export const wouldCreateSourceGroupCycle = ({
  currentPriceGroup,
  sourceGroupId,
  priceGroups,
}: {
  currentPriceGroup?: PriceGroup | null | undefined;
  sourceGroupId: string;
  priceGroups: PriceGroup[];
}): boolean => {
  const normalizedSourceGroupId = normalizeSourceGroupId(sourceGroupId, priceGroups);
  if (
    isProductSourcePriceSelected(normalizedSourceGroupId) ||
    normalizedSourceGroupId.length === 0
  ) {
    return false;
  }

  return walkSourceGroupChain({
    currentIdentifier: normalizedSourceGroupId,
    selfIdentifiers: resolveSelfIdentifiers(currentPriceGroup),
    groupByIdentifier: buildGroupByIdentifier(priceGroups),
  });
};
