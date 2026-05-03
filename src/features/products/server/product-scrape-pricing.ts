import 'server-only';

import type { PriceGroupForCalculation } from '@/shared/contracts/products/product';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type {
  MongoCurrencyDoc,
  MongoPriceGroupDoc,
} from '@/shared/lib/db/services/database-sync-types';

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value;
};

const resolveCurrencyCode = (
  group: MongoPriceGroupDoc,
  currencyById: ReadonlyMap<string, MongoCurrencyDoc>
): string => {
  const currencyId = toTrimmedString(group.currencyId);
  const currency = currencyById.get(currencyId);
  const currencyCode = toTrimmedString(currency?.code);
  return currencyCode.length > 0 ? currencyCode : currencyId;
};

const mapScrapePriceGroup = (
  group: MongoPriceGroupDoc,
  currencyById: ReadonlyMap<string, MongoCurrencyDoc>
): PriceGroupForCalculation | null => {
  const id = toTrimmedString(group.id ?? group.groupId);
  const currencyId = toTrimmedString(group.currencyId);
  if (id.length === 0 || currencyId.length === 0) return null;

  const currencyCode = resolveCurrencyCode(group, currencyById);
  const groupId = toTrimmedString(group.groupId);
  const type = toTrimmedString(group.type);
  const basePriceField = toTrimmedString(group.basePriceField);
  const sourceGroupId = toTrimmedString(group.sourceGroupId);
  return {
    id,
    groupId: groupId.length > 0 ? groupId : id,
    currencyId,
    type: type.length > 0 ? type : 'standard',
    basePriceField: basePriceField.length > 0 ? basePriceField : 'price',
    isDefault: group.isDefault === true,
    sourceGroupId: sourceGroupId.length > 0 ? sourceGroupId : null,
    priceMultiplier: toFiniteNumber(group.priceMultiplier, 1),
    addToPrice: toFiniteNumber(group.addToPrice, 0),
    currency: { code: currencyCode },
    currencyCode,
  };
};

export const listScrapePriceGroupsForCalculation = async (): Promise<
  PriceGroupForCalculation[]
> => {
  const mongo = await getMongoDb();
  const groups = await mongo.collection<MongoPriceGroupDoc>('price_groups').find({}).toArray();
  if (groups.length === 0) return [];

  const currencyIds = Array.from(
    new Set(
      groups
        .map((group: MongoPriceGroupDoc): string => toTrimmedString(group.currencyId))
        .filter((currencyId: string): boolean => currencyId.length > 0)
    )
  );
  const currencies =
    currencyIds.length > 0
      ? await mongo.collection<MongoCurrencyDoc>('currencies').find({ id: { $in: currencyIds } }).toArray()
      : [];
  const currencyById = new Map(
    currencies.map((currency: MongoCurrencyDoc) => [toTrimmedString(currency.id), currency])
  );

  return groups
    .map((group: MongoPriceGroupDoc): PriceGroupForCalculation | null =>
      mapScrapePriceGroup(group, currencyById)
    )
    .filter((group): group is PriceGroupForCalculation => group !== null);
};
