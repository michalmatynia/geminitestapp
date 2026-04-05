import 'server-only';

import type { PriceGroupForCalculation, ProductWithImages } from '@/shared/contracts/products/product';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { MongoPriceGroupDoc } from '@/shared/lib/db/services/database-sync-types';
import { getCatalogRepository } from '@/shared/lib/products/services/catalog-repository';
import { resolveProductPrimaryCatalogId } from '@/shared/lib/products/utils/effective-shipping-group';
import {
  matchesPriceGroupIdentifier,
  resolvePriceGroupIdentifierToId,
} from '@/shared/lib/products/utils/price-group-identifiers';
import {
  calculatePriceForCurrency,
  normalizeCurrencyCode,
} from '@/shared/lib/products/utils/priceCalculation';

type CurrencyDoc = {
  id?: string;
  code?: string;
};

export type TraderaListingPriceSource =
  | 'price_group_target_currency'
  | 'base_target_currency'
  | 'base_price_fallback'
  | 'missing_price';

export type TraderaListingPriceResolutionReason =
  | 'resolved_target_currency'
  | 'base_price_already_in_target_currency'
  | 'target_currency_unresolved'
  | 'missing_price_groups'
  | 'missing_base_price';

export type TraderaListingPriceResolution = {
  listingPrice: number | null;
  listingCurrencyCode: string;
  targetCurrencyCode: string;
  resolvedToTargetCurrency: boolean;
  basePrice: number | null;
  baseCurrencyCode: string | null;
  priceSource: TraderaListingPriceSource;
  reason: TraderaListingPriceResolutionReason;
  defaultPriceGroupId: string | null;
  catalogDefaultPriceGroupId: string | null;
  catalogId: string | null;
  catalogPriceGroupIds: string[];
  loadedPriceGroupIds: string[];
  matchedTargetPriceGroupIds: string[];
};

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toUniqueTrimmedStringArray = (values: ReadonlyArray<unknown>): string[] => {
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = toTrimmedString(value);
    if (!trimmed) {
      continue;
    }
    unique.add(trimmed);
  }
  return Array.from(unique);
};

const getGroupCurrencyCode = (
  group: Pick<PriceGroupForCalculation, 'currency' | 'currencyCode' | 'currencyId' | 'groupId'>
): string =>
  normalizeCurrencyCode(
    group.currency?.code ||
      group.currencyCode ||
      (typeof group.currencyId === 'string' ? group.currencyId : undefined) ||
      group.groupId
  );

const matchesTargetCurrency = (
  group: Pick<PriceGroupForCalculation, 'currency' | 'currencyCode' | 'currencyId' | 'groupId'>,
  normalizedTargetCurrencyCode: string
): boolean => {
  const groupCurrencyCode = getGroupCurrencyCode(group);
  const groupIdCode = normalizeCurrencyCode(group.groupId);
  const currencyIdCode =
    typeof group.currencyId === 'string' ? normalizeCurrencyCode(group.currencyId) : '';

  return (
    groupCurrencyCode === normalizedTargetCurrencyCode ||
    groupIdCode === normalizedTargetCurrencyCode ||
    Boolean(currencyIdCode && currencyIdCode === normalizedTargetCurrencyCode)
  );
};

const resolvePriceSource = ({
  listingPrice,
  resolvedToTargetCurrency,
  normalizedTargetCurrencyCode,
  normalizedBaseCurrencyCode,
}: {
  listingPrice: number | null;
  resolvedToTargetCurrency: boolean;
  normalizedTargetCurrencyCode: string;
  normalizedBaseCurrencyCode: string | null;
}): TraderaListingPriceSource => {
  if (listingPrice === null) {
    return 'missing_price';
  }

  if (resolvedToTargetCurrency && normalizedBaseCurrencyCode === normalizedTargetCurrencyCode) {
    return 'base_target_currency';
  }

  if (resolvedToTargetCurrency) {
    return 'price_group_target_currency';
  }

  return 'base_price_fallback';
};

const resolvePriceResolutionReason = ({
  listingPrice,
  resolvedToTargetCurrency,
  normalizedTargetCurrencyCode,
  normalizedBaseCurrencyCode,
  loadedPriceGroupIds,
}: {
  listingPrice: number | null;
  resolvedToTargetCurrency: boolean;
  normalizedTargetCurrencyCode: string;
  normalizedBaseCurrencyCode: string | null;
  loadedPriceGroupIds: string[];
}): TraderaListingPriceResolutionReason => {
  if (listingPrice === null) {
    return 'missing_base_price';
  }

  if (resolvedToTargetCurrency && normalizedBaseCurrencyCode === normalizedTargetCurrencyCode) {
    return 'base_price_already_in_target_currency';
  }

  if (resolvedToTargetCurrency) {
    return 'resolved_target_currency';
  }

  if (loadedPriceGroupIds.length === 0) {
    return 'missing_price_groups';
  }

  return 'target_currency_unresolved';
};

export const resolveTraderaListingPriceForProduct = async ({
  product,
  targetCurrencyCode = 'EUR',
}: {
  product: ProductWithImages;
  targetCurrencyCode?: string;
}): Promise<TraderaListingPriceResolution> => {
  const normalizedTargetCurrencyCode = normalizeCurrencyCode(targetCurrencyCode) || 'EUR';
  const basePrice = toFiniteNumber(product.price);
  const catalogId = resolveProductPrimaryCatalogId(product);

  const catalogRepository = await getCatalogRepository();
  const catalog = catalogId ? await catalogRepository.getCatalogById(catalogId) : null;
  const catalogDefaultPriceGroupId = toTrimmedString(catalog?.defaultPriceGroupId) || null;
  const defaultPriceGroupId =
    toTrimmedString(product.defaultPriceGroupId) || catalogDefaultPriceGroupId;
  const catalogPriceGroupIds = toUniqueTrimmedStringArray(catalog?.priceGroupIds ?? []);
  const requestedPriceGroupIds = toUniqueTrimmedStringArray([
    ...catalogPriceGroupIds,
    defaultPriceGroupId,
  ]);

  let priceGroups: PriceGroupForCalculation[] = [];

  if (requestedPriceGroupIds.length > 0) {
    const mongo = await getMongoDb();
    const priceGroupDocs = await mongo
      .collection<MongoPriceGroupDoc>('price_groups')
      .find(
        {
          $or: [{ id: { $in: requestedPriceGroupIds } }, { groupId: { $in: requestedPriceGroupIds } }],
        },
        {
          projection: {
            id: 1,
            groupId: 1,
            currencyId: 1,
            type: 1,
            isDefault: 1,
            sourceGroupId: 1,
            priceMultiplier: 1,
            addToPrice: 1,
          },
        }
      )
      .toArray();

    const currencyIds = toUniqueTrimmedStringArray(
      priceGroupDocs.map((priceGroupDoc) => priceGroupDoc.currencyId)
    );
    const currencies =
      currencyIds.length > 0
        ? await mongo
            .collection<CurrencyDoc>('currencies')
            .find(
              {
                $or: [{ id: { $in: currencyIds } }, { code: { $in: currencyIds } }],
              },
              {
                projection: {
                  id: 1,
                  code: 1,
                },
              }
            )
            .toArray()
        : [];

    const currencyCodeById = new Map<string, string>();
    for (const currency of currencies) {
      const currencyId = toTrimmedString(currency.id);
      const currencyCode = normalizeCurrencyCode(currency.code);
      if (currencyId && currencyCode) {
        currencyCodeById.set(currencyId, currencyCode);
      }
      if (currencyCode) {
        currencyCodeById.set(currencyCode, currencyCode);
      }
    }

    priceGroups = priceGroupDocs
      .map<PriceGroupForCalculation | null>((priceGroupDoc) => {
        const id = toTrimmedString(priceGroupDoc.id);
        const groupId = toTrimmedString(priceGroupDoc.groupId);
        const currencyId = toTrimmedString(priceGroupDoc.currencyId);
        if (!id || !currencyId) {
          return null;
        }

        const currencyCode =
          currencyCodeById.get(currencyId) || normalizeCurrencyCode(currencyId) || currencyId;

        return {
          id,
          ...(groupId ? { groupId } : {}),
          currencyId,
          type: toTrimmedString(priceGroupDoc.type) || 'standard',
          isDefault:
            Boolean(priceGroupDoc.isDefault) ||
            matchesPriceGroupIdentifier({ id, groupId }, defaultPriceGroupId),
          sourceGroupId: toTrimmedString(priceGroupDoc.sourceGroupId) || null,
          priceMultiplier: toFiniteNumber(priceGroupDoc.priceMultiplier) ?? 1,
          addToPrice: toFiniteNumber(priceGroupDoc.addToPrice) ?? 0,
          currency: { code: currencyCode },
          currencyCode,
        };
      })
      .filter((priceGroup): priceGroup is PriceGroupForCalculation => priceGroup !== null);
  }

  const calculation = calculatePriceForCurrency(
    basePrice,
    defaultPriceGroupId,
    normalizedTargetCurrencyCode,
    priceGroups
  );
  const listingPrice = toFiniteNumber(calculation.price);
  const listingCurrencyCode =
    normalizeCurrencyCode(calculation.currencyCode) || normalizedTargetCurrencyCode;
  const baseCurrencyCode =
    normalizeCurrencyCode(calculation.baseCurrencyCode) || listingCurrencyCode || null;
  const resolvedToTargetCurrency = listingCurrencyCode === normalizedTargetCurrencyCode;
  const resolvedDefaultPriceGroupId = defaultPriceGroupId
    ? resolvePriceGroupIdentifierToId(priceGroups, defaultPriceGroupId)
    : null;
  const resolvedCatalogDefaultPriceGroupId = catalogDefaultPriceGroupId
    ? resolvePriceGroupIdentifierToId(priceGroups, catalogDefaultPriceGroupId)
    : null;
  const resolvedCatalogPriceGroupIds = Array.from(
    new Set(catalogPriceGroupIds.map((identifier) => resolvePriceGroupIdentifierToId(priceGroups, identifier)))
  );
  const loadedPriceGroupIds = priceGroups.map((priceGroup) => priceGroup.id);
  const matchedTargetPriceGroupIds = priceGroups
    .filter((priceGroup) => matchesTargetCurrency(priceGroup, normalizedTargetCurrencyCode))
    .map((priceGroup) => priceGroup.id);

  return {
    listingPrice,
    listingCurrencyCode,
    targetCurrencyCode: normalizedTargetCurrencyCode,
    resolvedToTargetCurrency,
    basePrice,
    baseCurrencyCode,
    priceSource: resolvePriceSource({
      listingPrice,
      resolvedToTargetCurrency,
      normalizedTargetCurrencyCode,
      normalizedBaseCurrencyCode: baseCurrencyCode,
    }),
    reason: resolvePriceResolutionReason({
      listingPrice,
      resolvedToTargetCurrency,
      normalizedTargetCurrencyCode,
      normalizedBaseCurrencyCode: baseCurrencyCode,
      loadedPriceGroupIds,
    }),
    defaultPriceGroupId: resolvedDefaultPriceGroupId,
    catalogDefaultPriceGroupId: resolvedCatalogDefaultPriceGroupId,
    catalogId,
    catalogPriceGroupIds: resolvedCatalogPriceGroupIds,
    loadedPriceGroupIds,
    matchedTargetPriceGroupIds,
  };
};
