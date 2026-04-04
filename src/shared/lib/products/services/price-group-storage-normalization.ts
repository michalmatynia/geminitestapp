import type { Db } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

type MongoCollectionProvider = Pick<Db, 'collection'>;

const PRICE_GROUP_COLLECTION = 'price_groups';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toUniqueTrimmedStrings = (values: string[] | undefined): string[] =>
  Array.from(new Set((values ?? []).map(toTrimmedString).filter(Boolean)));

export const buildCanonicalPriceGroupIdMap = async (
  provider: string,
  identifiers: string[],
  mongo?: MongoCollectionProvider
): Promise<Map<string, string>> => {
  if (provider !== 'mongodb' || identifiers.length === 0) {
    return new Map<string, string>();
  }

  const db = mongo ?? (await getMongoDb());
  const rows = await db
    .collection<{ id?: string; groupId?: string }>(PRICE_GROUP_COLLECTION)
    .find(
      {
        $or: [{ id: { $in: identifiers } }, { groupId: { $in: identifiers } }],
      },
      { projection: { id: 1, groupId: 1 } }
    )
    .toArray();

  const canonicalIdByIdentifier = new Map<string, string>();
  rows.forEach((row: { id?: string; groupId?: string }) => {
    const id = toTrimmedString(row.id);
    const groupId = toTrimmedString(row.groupId);
    if (!id) return;
    canonicalIdByIdentifier.set(id, id);
    if (groupId) canonicalIdByIdentifier.set(groupId, id);
  });

  return canonicalIdByIdentifier;
};

export const normalizePriceGroupIdentifierForStorage = async (
  provider: string,
  identifier: unknown,
  options: { mongo?: MongoCollectionProvider } = {}
): Promise<string | null> => {
  const normalizedIdentifier = toTrimmedString(identifier);
  if (!normalizedIdentifier) return null;

  const canonicalIdByIdentifier = await buildCanonicalPriceGroupIdMap(
    provider,
    [normalizedIdentifier],
    options.mongo
  );

  return canonicalIdByIdentifier.get(normalizedIdentifier) ?? normalizedIdentifier;
};

export const normalizePriceGroupSelectionForStorage = async (
  provider: string,
  selection: {
    priceGroupIds?: string[];
    defaultPriceGroupId?: string | null;
  },
  options: { mongo?: MongoCollectionProvider } = {}
): Promise<{ priceGroupIds: string[]; defaultPriceGroupId: string | null }> => {
  const rawPriceGroupIds = toUniqueTrimmedStrings(selection.priceGroupIds);
  const rawDefaultPriceGroupId = toTrimmedString(selection.defaultPriceGroupId) || null;

  const identifiersToResolve = Array.from(
    new Set(
      [...rawPriceGroupIds, rawDefaultPriceGroupId].filter(
        (identifier): identifier is string => Boolean(identifier)
      )
    )
  );

  const canonicalIdByIdentifier = await buildCanonicalPriceGroupIdMap(
    provider,
    identifiersToResolve,
    options.mongo
  );

  return {
    priceGroupIds: Array.from(
      new Set(
        rawPriceGroupIds.map(
          (identifier: string) => canonicalIdByIdentifier.get(identifier) ?? identifier
        )
      )
    ),
    defaultPriceGroupId: rawDefaultPriceGroupId
      ? (canonicalIdByIdentifier.get(rawDefaultPriceGroupId) ?? rawDefaultPriceGroupId)
      : null,
  };
};
