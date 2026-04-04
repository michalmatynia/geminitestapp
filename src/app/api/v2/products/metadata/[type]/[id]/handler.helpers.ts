import type { Filter, UpdateFilter } from 'mongodb';

import type {
  MongoCatalogDoc,
  MongoCurrencyDoc,
  MongoPriceGroupDoc,
} from '@/shared/lib/db/services/database-sync-types';
import {
  readMetadataBoolean,
  readMetadataNumber,
  readMetadataString,
  resolvePriceGroupType,
} from '../../handler.helpers';

export const buildMongoPriceGroupLookupFilter = (
  idOrGroupId: string
): Filter<MongoPriceGroupDoc> => ({
  $or: [{ id: idOrGroupId }, { groupId: idOrGroupId }],
});

export const buildMongoPriceGroupIdentifierList = ({
  resolvedId,
  groupId,
}: {
  resolvedId: string;
  groupId?: string | null;
}): string[] =>
  Array.from(
    new Set([resolvedId, groupId].filter((value): value is string => typeof value === 'string' && value.trim().length > 0))
  );

export const buildMongoPriceGroupFieldLookupFilter = ({
  field,
  identifiers,
}: {
  field: 'defaultPriceGroupId' | 'sourceGroupId' | 'priceGroupIds';
  identifiers: string[];
}): Filter<MongoCatalogDoc | MongoPriceGroupDoc> =>
  identifiers.length === 1
    ? ({ [field]: identifiers[0] } as Filter<MongoCatalogDoc | MongoPriceGroupDoc>)
    : ({ [field]: { $in: identifiers } } as Filter<MongoCatalogDoc | MongoPriceGroupDoc>);

export const buildMongoPriceGroupCurrencyLookupFilter = ({
  currencyId,
  currencyCode,
}: {
  currencyId: string | null;
  currencyCode: string | null | undefined;
}): Filter<MongoCurrencyDoc> => ({
  $or: [
    ...(currencyId ? [{ id: currencyId }, { code: currencyId }] : []),
    ...(currencyCode ? [{ code: currencyCode }] : []),
  ],
});

export const buildMongoPriceGroupCurrencyByIdMap = (
  currencyDoc: MongoCurrencyDoc | null
): Map<string, MongoCurrencyDoc> => {
  const currencyById = new Map<string, MongoCurrencyDoc>();
  if (currencyDoc) {
    currencyById.set(String(currencyDoc.id ?? currencyDoc.code ?? ''), currencyDoc);
  }
  return currencyById;
};

export const buildMongoPriceGroupUpdateDocument = ({
  data,
  existing,
  resolvedSourceGroupId,
  currencyDoc,
  now = new Date(),
}: {
  data: Record<string, unknown>;
  existing: Pick<MongoPriceGroupDoc, 'sourceGroupId'>;
  resolvedSourceGroupId?: string | null;
  currencyDoc?: MongoCurrencyDoc | null;
  now?: Date;
}): Record<string, unknown> => {
  const update: Record<string, unknown> = { updatedAt: now };

  if (currencyDoc) {
    update['currencyId'] = String(currencyDoc.id ?? currencyDoc.code ?? '');
  }

  const groupId = readMetadataString(data, 'groupId');
  if (groupId) update['groupId'] = groupId;

  const name = readMetadataString(data, 'name');
  if (name) update['name'] = name;

  if ('description' in data) {
    update['description'] = data['description'] === null ? null : readMetadataString(data, 'description');
  }

  const isDefault = readMetadataBoolean(data, 'isDefault');
  if (isDefault !== null) update['isDefault'] = isDefault;

  if ('sourceGroupId' in data) {
    update['sourceGroupId'] = data['sourceGroupId'] === null ? null : (resolvedSourceGroupId ?? null);
  }

  if ('type' in data || 'sourceGroupId' in data) {
    update['type'] = resolvePriceGroupType(
      data['type'],
      (update['sourceGroupId'] as string | null | undefined) ?? existing.sourceGroupId ?? null
    );
  }

  const basePriceField = readMetadataString(data, 'basePriceField');
  if (basePriceField) update['basePriceField'] = basePriceField;

  const priceMultiplier = readMetadataNumber(data, 'priceMultiplier');
  if (priceMultiplier !== null) update['priceMultiplier'] = priceMultiplier;

  const addToPrice = readMetadataNumber(data, 'addToPrice');
  if (addToPrice !== null) update['addToPrice'] = Math.trunc(addToPrice);

  return update;
};

export const buildMongoPriceGroupCatalogPullUpdate = ({
  identifiers,
  now,
}: {
  identifiers: string[];
  now: Date;
}): UpdateFilter<MongoCatalogDoc> => ({
  $pull: { priceGroupIds: identifiers.length === 1 ? identifiers[0] : { $in: identifiers } },
  $set: { updatedAt: now },
});

export const buildMongoPriceGroupDefaultUnsetUpdate = (now: Date) => ({
  $set: { defaultPriceGroupId: null, updatedAt: now },
});

export const buildMongoPriceGroupSourceUnsetUpdate = (now: Date) => ({
  $set: { sourceGroupId: null, updatedAt: now },
});
