type PriceGroupLike = {
  id?: string | null;
  groupId?: string | null;
};

const normalizeIdentifier = (value: string | null | undefined): string => String(value ?? '').trim();

export const matchesPriceGroupIdentifier = (
  group: PriceGroupLike,
  identifier: string | null | undefined
): boolean => {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier) return false;

  return (
    normalizeIdentifier(group.id) === normalizedIdentifier ||
    normalizeIdentifier(group.groupId) === normalizedIdentifier
  );
};

export const findPriceGroupByIdentifier = <TGroup extends PriceGroupLike>(
  groups: TGroup[],
  identifier: string | null | undefined
): TGroup | undefined => groups.find((group) => matchesPriceGroupIdentifier(group, identifier));

export const resolvePriceGroupIdentifierToId = <TGroup extends PriceGroupLike>(
  groups: TGroup[],
  identifier: string | null | undefined
): string => findPriceGroupByIdentifier(groups, identifier)?.id?.trim() ?? normalizeIdentifier(identifier);
