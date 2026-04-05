import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import { badRequestError } from '@/shared/errors/app-error';
import type {
  MongoCurrencyDoc,
  MongoPriceGroupDoc,
} from '@/shared/lib/db/services/database-sync-types';

export const readMetadataString = (
  record: Record<string, unknown>,
  key: string
): string | null => {
  const raw = record[key];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const readMetadataNumber = (
  record: Record<string, unknown>,
  key: string
): number | null => {
  const raw = record[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const readMetadataBoolean = (
  record: Record<string, unknown>,
  key: string
): boolean | null => {
  const raw = record[key];
  if (typeof raw === 'boolean') return raw;
  return null;
};

export const normalizePriceGroupId = (value: string): string => {
  const normalized = value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .toUpperCase();
  return normalized || 'PRICE_GROUP';
};

export const resolvePriceGroupType = (
  value: unknown,
  sourceGroupId: string | null
): 'standard' | 'dependent' => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'standard' || normalized === 'dependent') {
      return normalized;
    }
  }

  return sourceGroupId ? 'dependent' : 'standard';
};

export const assertValidPriceGroupTypeDependencies = ({
  groupType,
  sourceGroupId,
}: {
  groupType: 'standard' | 'dependent';
  sourceGroupId: string | null;
}): void => {
  if (groupType === 'dependent' && !sourceGroupId) {
    throw badRequestError('Invalid payload. dependent group requires sourceGroupId.');
  }
};

export const assertNoPriceGroupDependencyCycle = async ({
  priceGroupId,
  priceGroupKey,
  sourceGroupId,
  findPriceGroupById,
}: {
  priceGroupId: string;
  priceGroupKey?: string | null;
  sourceGroupId: string | null;
  findPriceGroupById: (idOrGroupId: string) => Promise<Pick<MongoPriceGroupDoc, 'sourceGroupId'> | null>;
}): Promise<void> => {
  if (!sourceGroupId) return;

  const selfKeys = new Set<string>([priceGroupId, priceGroupKey].filter(Boolean) as string[]);
  const visited = new Set<string>();
  let currentGroupId: string | null = sourceGroupId;

  while (currentGroupId) {
    if (selfKeys.has(currentGroupId) || visited.has(currentGroupId)) {
      throw badRequestError('Invalid payload. price group dependency cycle detected.');
    }
    visited.add(currentGroupId);
    const linkedGroup = await findPriceGroupById(currentGroupId);
    currentGroupId = linkedGroup?.sourceGroupId ?? null;
  }
};

export const resolvePriceGroupBaseId = ({
  payload,
  currencyCodeFromPayload,
}: {
  payload: Record<string, unknown>;
  currencyCodeFromPayload: string | null;
}): string => {
  const explicitGroupId = readMetadataString(payload, 'groupId');
  const fallbackFromName = readMetadataString(payload, 'name');
  const fallbackFromCurrency =
    currencyCodeFromPayload ?? readMetadataString(payload, 'currencyCode');

  return normalizePriceGroupId(
    explicitGroupId ?? fallbackFromCurrency ?? fallbackFromName ?? 'PRICE_GROUP'
  );
};

export const resolveAvailablePriceGroupId = async ({
  baseGroupId,
  findExistingByGroupId,
}: {
  baseGroupId: string;
  findExistingByGroupId: (groupId: string) => Promise<unknown>;
}): Promise<string> => {
  let groupId = baseGroupId;
  let sequence = 2;

  while (sequence < 1000) {
    const existing = await findExistingByGroupId(groupId);
    if (!existing) break;
    groupId = `${baseGroupId}_${sequence}`;
    sequence += 1;
  }

  return groupId;
};

export const buildMongoPriceGroupCreateDocs = ({
  payload,
  currencyDoc,
  groupId,
  groupType,
  resolvedSourceGroupId,
  now = new Date(),
}: {
  payload: Record<string, unknown>;
  currencyDoc: MongoCurrencyDoc;
  groupId: string;
  groupType: 'standard' | 'dependent';
  resolvedSourceGroupId?: string | null;
  now?: Date;
}): {
  created: MongoPriceGroupDoc;
  insertDoc: MongoPriceGroupDoc;
} => {
  const created: MongoPriceGroupDoc = {
    id: randomUUID(),
    groupId,
    isDefault: readMetadataBoolean(payload, 'isDefault') ?? false,
    name: readMetadataString(payload, 'name') ?? groupId,
    description: readMetadataString(payload, 'description'),
    currencyId: String(currencyDoc.id ?? currencyDoc.code ?? ''),
    type: groupType,
    basePriceField: readMetadataString(payload, 'basePriceField') ?? 'price',
    sourceGroupId:
      resolvedSourceGroupId !== undefined
        ? resolvedSourceGroupId
        : readMetadataString(payload, 'sourceGroupId'),
    priceMultiplier: readMetadataNumber(payload, 'priceMultiplier') ?? 1,
    addToPrice: Math.trunc(readMetadataNumber(payload, 'addToPrice') ?? 0),
    createdAt: now,
    updatedAt: now,
  };

  return {
    created,
    insertDoc: {
      _id: new ObjectId(),
      ...created,
    },
  };
};
