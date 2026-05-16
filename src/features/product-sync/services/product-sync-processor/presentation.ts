import type {
  ProductSyncFieldRule,
} from '@/shared/contracts/product-sync';
import { getProductSyncBaseFieldPresentation } from '@/shared/contracts/product-sync';
import type { BaseWarehouse } from '@/shared/contracts/integrations/base-com';
import type { MongoPriceGroupDoc } from '@/shared/lib/db/services/database-sync-types';
import { getMongoDb } from '@/shared/lib/db/product-mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { fetchBaseWarehouses } from '@/server/integrations';

import { toTrimmedString } from './utils';
import type {
  ProductSyncBaseFieldPresentationMetadata,
  BaseConnectionContext,
} from './types';

export const createEmptyBaseFieldPresentationMetadata = (): ProductSyncBaseFieldPresentationMetadata => ({
  warehousesByIdentifier: new Map(),
  priceGroupsByIdentifier: new Map(),
});

export const getDynamicStockIdentifier = (rule: ProductSyncFieldRule): string | null => {
  if (rule.appField !== 'stock') return null;
  const normalizedBaseField = toTrimmedString(rule.baseField);
  if (!normalizedBaseField.startsWith('stock.')) return null;
  return toTrimmedString(normalizedBaseField.slice('stock.'.length)) !== '' ? toTrimmedString(normalizedBaseField.slice('stock.'.length)) : null;
};

export const getDynamicPriceGroupIdentifier = (rule: ProductSyncFieldRule): string | null => {
  if (rule.appField !== 'price') return null;
  const normalizedBaseField = toTrimmedString(rule.baseField);
  if (!normalizedBaseField.startsWith('prices.')) return null;
  return toTrimmedString(normalizedBaseField.slice('prices.'.length)) !== '' ? toTrimmedString(normalizedBaseField.slice('prices.'.length)) : null;
};

export const resolveWarehouseBaseFieldPresentation = (input: {
  identifier: string;
  warehouse: {
    name: string;
    isDefault: boolean;
  };
}): { label: string; description: string | null; isKnown: boolean } => {
  const suffix = input.warehouse.isDefault ? ' [default]' : '';
  return {
    label: `Warehouse stock: ${input.warehouse.name} (${input.identifier})`,
    description: `Stock for Base.com warehouse ${input.warehouse.name} (${input.identifier})${suffix}.`,
    isKnown: true,
  };
};

export const resolvePriceGroupBaseFieldPresentation = (input: {
  identifier: string;
  priceGroup: {
    name: string;
    currencyCode: string | null;
    isDefault: boolean;
  };
}): { label: string; description: string | null; isKnown: boolean } => {
  const details = [
    input.priceGroup.currencyCode,
    input.priceGroup.isDefault ? 'default' : null,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const suffix = details.length > 0 ? ` [${details.join(', ')}]` : '';
  return {
    label: `Price group: ${input.priceGroup.name} (${input.identifier})`,
    description: `Price for Base.com price group ${input.priceGroup.name} (${input.identifier})${suffix}.`,
    isKnown: true,
  };
};

export const getEffectiveBaseFieldPresentation = (
  rule: ProductSyncFieldRule,
  metadata?: ProductSyncBaseFieldPresentationMetadata
): { label: string; description: string | null; isKnown: boolean } => {
  const fallbackPresentation = getProductSyncBaseFieldPresentation(rule.appField, rule.baseField);
  if (metadata == null) return fallbackPresentation;

  const warehouseIdentifier = getDynamicStockIdentifier(rule);
  if (warehouseIdentifier !== null) {
    const warehouse = metadata.warehousesByIdentifier.get(warehouseIdentifier);
    if (warehouse != null) {
      return resolveWarehouseBaseFieldPresentation({
        identifier: warehouseIdentifier,
        warehouse,
      });
    }
  }

  const priceGroupIdentifier = getDynamicPriceGroupIdentifier(rule);
  if (priceGroupIdentifier !== null) {
    const priceGroup = metadata.priceGroupsByIdentifier.get(priceGroupIdentifier);
    if (priceGroup != null) {
      return resolvePriceGroupBaseFieldPresentation({
        identifier: priceGroupIdentifier,
        priceGroup,
      });
    }
  }

  return fallbackPresentation;
};

export const loadWarehousePresentationMetadata = async (input: {
  token: string;
  inventoryId: string;
  identifiers: string[];
}): Promise<ProductSyncBaseFieldPresentationMetadata['warehousesByIdentifier']> => {
  if (input.identifiers.length === 0) {
    return new Map();
  }

  const wantedIdentifiers = new Set(input.identifiers.map(toTrimmedString).filter((id): id is string => id !== ''));

  try {
    const warehouses = await fetchBaseWarehouses(input.token, input.inventoryId);
    const warehousesByIdentifier: ProductSyncBaseFieldPresentationMetadata['warehousesByIdentifier'] =
      new Map();

    warehouses.forEach((warehouse: BaseWarehouse) => {
      const identifiers = [
        toTrimmedString(warehouse.id),
        toTrimmedString(warehouse.typedId),
      ].filter((id): id is string => id !== '');
      if (identifiers.length === 0) return;

      const name = (toTrimmedString(warehouse.name) !== '' ? toTrimmedString(warehouse.name) : identifiers[0]) ?? 'unknown';
      identifiers.forEach((identifier: string) => {
        if (!wantedIdentifiers.has(identifier)) return;
        warehousesByIdentifier.set(identifier, {
          name,
          isDefault: warehouse.is_default === true,
        });
      });
    });

    return warehousesByIdentifier;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-sync-processor',
      action: 'loadWarehousePresentationMetadata',
      inventoryId: input.inventoryId,
      identifierCount: input.identifiers.length,
    });
    return new Map();
  }
};

export const loadPriceGroupPresentationMetadata = async (
  identifiers: string[]
): Promise<ProductSyncBaseFieldPresentationMetadata['priceGroupsByIdentifier']> => {
  if (identifiers.length === 0) {
    return new Map();
  }

  const wantedIdentifiers = Array.from(new Set(identifiers.map(toTrimmedString).filter((id): id is string => id !== '')));
  if (wantedIdentifiers.length === 0) {
    return new Map();
  }

  try {
    const mongo = await getMongoDb();
    const priceGroups = (await mongo
      .collection<MongoPriceGroupDoc>('price_groups')
      .find(
        {
          $or: [{ id: { $in: wantedIdentifiers } }, { groupId: { $in: wantedIdentifiers } }],
        },
        {
          projection: {
            id: 1,
            groupId: 1,
            name: 1,
            currencyId: 1,
            isDefault: 1,
          },
        }
      )
      .toArray()) as MongoPriceGroupDoc[];

    const currencyIds = Array.from(
      new Set(
        priceGroups
          .map((group: MongoPriceGroupDoc) => toTrimmedString(group.currencyId))
          .filter((id): id is string => id !== '')
      )
    );
    const currencyDocs = currencyIds.length > 0
      ? ((await mongo
          .collection<{ id?: string; code?: string }>('currencies')
          .find({ id: { $in: currencyIds } }, { projection: { id: 1, code: 1 } })
          .toArray()) as Array<{ id?: string; code?: string }>)
      : [];
    const currencyCodeById = new Map(
      currencyDocs.map((currency: { id?: string; code?: string }) => [
        toTrimmedString(currency.id),
        toTrimmedString(currency.code) !== '' ? toTrimmedString(currency.code) : null,
      ])
    );

    const priceGroupsByIdentifier: ProductSyncBaseFieldPresentationMetadata['priceGroupsByIdentifier'] =
      new Map();

    priceGroups.forEach((group: MongoPriceGroupDoc) => {
      const identifiersForGroup = [
        toTrimmedString(group.groupId),
        toTrimmedString(group.id),
      ].filter((id): id is string => id !== '');
      if (identifiersForGroup.length === 0) return;

      const name = (toTrimmedString(group.name) !== '' ? toTrimmedString(group.name) : identifiersForGroup[0]) ?? 'unknown';
      const currencyCode = currencyCodeById.get(toTrimmedString(group.currencyId)) ?? null;
      identifiersForGroup.forEach((identifier: string) => {
        if (!wantedIdentifiers.includes(identifier)) return;
        priceGroupsByIdentifier.set(identifier, {
          name,
          currencyCode,
          isDefault: group.isDefault === true,
        });
      });
    });

    return priceGroupsByIdentifier;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-sync-processor',
      action: 'loadPriceGroupPresentationMetadata',
      identifierCount: identifiers.length,
    });
    return new Map();
  }
};

export const resolveBaseFieldPresentationMetadata = async (input: {
  connectionContext: BaseConnectionContext;
  rules: ProductSyncFieldRule[];
}): Promise<ProductSyncBaseFieldPresentationMetadata> => {
  const warehouseIdentifiers = Array.from(
    new Set(
      input.rules
        .map((rule: ProductSyncFieldRule) => getDynamicStockIdentifier(rule))
        .filter((value: string | null): value is string => value !== null && value.length > 0)
    )
  );
  const priceGroupIdentifiers = Array.from(
    new Set(
      input.rules
        .map((rule: ProductSyncFieldRule) => getDynamicPriceGroupIdentifier(rule))
        .filter((value: string | null): value is string => value !== null && value.length > 0)
    )
  );

  if (warehouseIdentifiers.length === 0 && priceGroupIdentifiers.length === 0) {
    return createEmptyBaseFieldPresentationMetadata();
  }

  const [warehousesByIdentifier, priceGroupsByIdentifier] = await Promise.all([
    loadWarehousePresentationMetadata({
      token: input.connectionContext.token,
      inventoryId: input.connectionContext.inventoryId,
      identifiers: warehouseIdentifiers,
    }),
    loadPriceGroupPresentationMetadata(priceGroupIdentifiers),
  ]);

  return {
    warehousesByIdentifier,
    priceGroupsByIdentifier,
  };
};
