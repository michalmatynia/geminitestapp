import 'server-only';

import { randomUUID } from 'crypto';

import {
  getDefaultProductSyncProfile,
  getProductSyncProfile,
  getProductSyncRun,
  hasActiveProductSyncRun,
  putProductSyncRunItem,
  touchProductSyncProfileLastRunAt,
  updateProductSyncRun,
  updateProductSyncRunStatus,
} from '@/features/product-sync/services/product-sync-repository';
import {
  checkBaseSkuExists,
  getExportDefaultConnectionId,
  getIntegrationRepository,
  getProductListingRepository,
  findProductListingByProductAndConnectionAcrossProviders,
  resolveBaseConnectionToken,
  callBaseApi,
  fetchBaseProductDetails,
  fetchBaseWarehouses,
} from '@/server/integrations';
import {
  buildEffectiveProductSyncFieldRules,
  getProductSyncAppFieldLabel,
} from '@/shared/contracts/product-sync';
import type {
  ProductSyncAppField,
  ProductSyncFieldPreview,
  ProductSyncFieldRule,
  ProductSyncProfile,
  ProductSyncPreview,
  ProductSyncTargetSource,
  ProductSyncSingleProductResponse,
  ProductSyncRunItemRecord,
  ProductSyncRunRecord,
  ProductSyncRunStats,
  ProductSyncRunStatus,
} from '@/shared/contracts/product-sync';
import { getProductSyncBaseFieldPresentation } from '@/shared/contracts/product-sync';
import type { BaseWarehouse } from '@/shared/contracts/integrations/base-com';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { UpdateProductInput } from '@/shared/contracts/products/io';
import type { MongoPriceGroupDoc } from '@/shared/lib/db/services/database-sync-types';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const BASE_INTEGRATION_SLUGS = new Set(['base', 'base-com', 'baselinker']);
const BASE_DETAILS_BATCH_SIZE = 100;
const RUN_PROGRESS_FLUSH_EVERY_ITEMS = 25;
const RUN_PROGRESS_FLUSH_EVERY_MS = 20_000;

type BaseConnectionContext = {
  integrationId: string;
  connectionId: string;
  connectionName: string | null;
  inventoryId: string;
  token: string;
};

type LinkedProductSyncResult = {
  status: 'success' | 'skipped' | 'failed';
  localChanges: string[];
  baseChanges: string[];
  message: string | null;
  errorMessage: string | null;
};

type LinkedProductSyncPlan = {
  fields: ProductSyncFieldPreview[];
  localPatch: Record<string, unknown>;
  basePayload: Record<string, unknown>;
  localChanges: string[];
  baseChanges: string[];
};

type BaseSyncResolvedTarget = {
  baseProductId: string | null;
  linkedVia: 'product' | 'listing' | 'sku_backfill' | 'none';
};

type ResolvedProductSyncTarget = {
  product: ProductWithImages;
  target: BaseSyncResolvedTarget;
};

type ProductSyncBaseFieldPresentationMetadata = {
  warehousesByIdentifier: Map<
    string,
    {
      name: string;
      isDefault: boolean;
    }
  >;
  priceGroupsByIdentifier: Map<
    string,
    {
      name: string;
      currencyCode: string | null;
      isDefault: boolean;
    }
  >;
};

const isTerminalRunStatus = (status: ProductSyncRunStatus): boolean =>
  status === 'completed' || status === 'partial_success' || status === 'failed';

const nowIso = (): string => new Date().toISOString();

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const coerceNumber = (value: unknown): number | null => {
  const direct = toFiniteNumber(value);
  if (direct !== null) return Math.max(0, Math.round(direct));

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = coerceNumber(item);
      if (parsed !== null) return parsed;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      const parsed = coerceNumber(entry);
      if (parsed !== null) return parsed;
    }
  }

  return null;
};

const normalizeFieldValue = (
  appField: ProductSyncAppField,
  value: unknown
): string | number | null => {
  if (appField === 'stock' || appField === 'price' || appField === 'weight') {
    return coerceNumber(value);
  }
  const stringValue = toTrimmedString(value);
  return stringValue || null;
};

const valuesEqual = (appField: ProductSyncAppField, left: unknown, right: unknown): boolean => {
  const normalizedLeft = normalizeFieldValue(appField, left);
  const normalizedRight = normalizeFieldValue(appField, right);

  if (normalizedLeft === null && normalizedRight === null) return true;
  return normalizedLeft === normalizedRight;
};

const getProductFieldValue = (product: ProductWithImages, field: ProductSyncAppField): unknown => {
  if (field === 'name_en') return product.name_en;
  if (field === 'description_en') return product.description_en;
  if (field === 'stock') return product.stock;
  if (field === 'price') return product.price;
  if (field === 'sku') return product.sku;
  if (field === 'ean') return product.ean;
  if (field === 'weight') return product.weight;
  return null;
};

const resolvePathValue = (record: Record<string, unknown>, path: string): unknown => {
  const normalizedPath = toTrimmedString(path);
  if (!normalizedPath) return undefined;

  const parts = normalizedPath.split('.').map((segment: string) => segment.trim());
  let current: unknown = record;

  for (const segment of parts) {
    if (!segment) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isFinite(index)) return undefined;
      current = current[index];
      continue;
    }
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const resolveDefaultBaseValue = (
  appField: ProductSyncAppField,
  record: Record<string, unknown>
): unknown => {
  if (appField === 'stock') {
    return resolvePathValue(record, 'stock');
  }
  if (appField === 'price') {
    const byDefaultGroup = resolvePathValue(record, 'prices.0');
    if (byDefaultGroup !== undefined) return byDefaultGroup;
    return resolvePathValue(record, 'price');
  }
  if (appField === 'name_en') {
    return (
      resolvePathValue(record, 'text_fields.name') ??
      resolvePathValue(record, 'text_fields.name|en') ??
      resolvePathValue(record, 'name') ??
      resolvePathValue(record, 'name_en')
    );
  }
  if (appField === 'description_en') {
    return (
      resolvePathValue(record, 'text_fields.description') ??
      resolvePathValue(record, 'text_fields.description|en') ??
      resolvePathValue(record, 'description') ??
      resolvePathValue(record, 'description_en')
    );
  }
  if (appField === 'sku') {
    return resolvePathValue(record, 'sku');
  }
  if (appField === 'ean') {
    return resolvePathValue(record, 'ean');
  }
  if (appField === 'weight') {
    return resolvePathValue(record, 'weight');
  }
  return undefined;
};

const resolveBaseValueByRule = (
  rule: ProductSyncFieldRule,
  record: Record<string, unknown>
): unknown => {
  const byPath = resolvePathValue(record, rule.baseField);
  if (byPath !== undefined && byPath !== null) {
    return byPath;
  }
  return resolveDefaultBaseValue(rule.appField, record);
};

const setPathValue = (target: Record<string, unknown>, path: string, value: unknown): void => {
  const normalizedPath = toTrimmedString(path);
  if (!normalizedPath) return;

  const segments = normalizedPath.split('.').map((segment: string) => segment.trim());
  if (segments.length === 0) return;

  let current: Record<string, unknown> = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    if (!key) return;
    const next = current[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = segments[segments.length - 1];
  if (!lastKey) return;
  current[lastKey] = value;
};

const createEmptyBaseFieldPresentationMetadata = (): ProductSyncBaseFieldPresentationMetadata => ({
  warehousesByIdentifier: new Map(),
  priceGroupsByIdentifier: new Map(),
});

const getDynamicStockIdentifier = (rule: ProductSyncFieldRule): string | null => {
  if (rule.appField !== 'stock') return null;
  const normalizedBaseField = toTrimmedString(rule.baseField);
  if (!normalizedBaseField.startsWith('stock.')) return null;
  return toTrimmedString(normalizedBaseField.slice('stock.'.length)) || null;
};

const getDynamicPriceGroupIdentifier = (rule: ProductSyncFieldRule): string | null => {
  if (rule.appField !== 'price') return null;
  const normalizedBaseField = toTrimmedString(rule.baseField);
  if (!normalizedBaseField.startsWith('prices.')) return null;
  return toTrimmedString(normalizedBaseField.slice('prices.'.length)) || null;
};

const resolveWarehouseBaseFieldPresentation = (input: {
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

const resolvePriceGroupBaseFieldPresentation = (input: {
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

const getEffectiveBaseFieldPresentation = (
  rule: ProductSyncFieldRule,
  metadata?: ProductSyncBaseFieldPresentationMetadata
): { label: string; description: string | null; isKnown: boolean } => {
  const fallbackPresentation = getProductSyncBaseFieldPresentation(rule.appField, rule.baseField);
  if (!metadata) return fallbackPresentation;

  const warehouseIdentifier = getDynamicStockIdentifier(rule);
  if (warehouseIdentifier) {
    const warehouse = metadata.warehousesByIdentifier.get(warehouseIdentifier);
    if (warehouse) {
      return resolveWarehouseBaseFieldPresentation({
        identifier: warehouseIdentifier,
        warehouse,
      });
    }
  }

  const priceGroupIdentifier = getDynamicPriceGroupIdentifier(rule);
  if (priceGroupIdentifier) {
    const priceGroup = metadata.priceGroupsByIdentifier.get(priceGroupIdentifier);
    if (priceGroup) {
      return resolvePriceGroupBaseFieldPresentation({
        identifier: priceGroupIdentifier,
        priceGroup,
      });
    }
  }

  return fallbackPresentation;
};

const loadWarehousePresentationMetadata = async (input: {
  token: string;
  inventoryId: string;
  identifiers: string[];
}): Promise<ProductSyncBaseFieldPresentationMetadata['warehousesByIdentifier']> => {
  if (input.identifiers.length === 0) {
    return new Map();
  }

  const wantedIdentifiers = new Set(input.identifiers.map(toTrimmedString).filter(Boolean));

  try {
    const warehouses = await fetchBaseWarehouses(input.token, input.inventoryId);
    const warehousesByIdentifier: ProductSyncBaseFieldPresentationMetadata['warehousesByIdentifier'] =
      new Map();

    warehouses.forEach((warehouse: BaseWarehouse) => {
      const identifiers = [
        toTrimmedString(warehouse.id),
        toTrimmedString(warehouse.typedId),
      ].filter(Boolean);
      if (identifiers.length === 0) return;

      const name = toTrimmedString(warehouse.name) || identifiers[0];
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
    void ErrorSystem.captureException(error);
    return new Map();
  }
};

const loadPriceGroupPresentationMetadata = async (
  identifiers: string[]
): Promise<ProductSyncBaseFieldPresentationMetadata['priceGroupsByIdentifier']> => {
  if (identifiers.length === 0) {
    return new Map();
  }

  const wantedIdentifiers = Array.from(new Set(identifiers.map(toTrimmedString).filter(Boolean)));
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
          .filter(Boolean)
      )
    );
    const currencyDocs = currencyIds.length
      ? ((await mongo
          .collection<{ id?: string; code?: string }>('currencies')
          .find({ id: { $in: currencyIds } }, { projection: { id: 1, code: 1 } })
          .toArray()) as Array<{ id?: string; code?: string }>)
      : [];
    const currencyCodeById = new Map(
      currencyDocs.map((currency: { id?: string; code?: string }) => [
        toTrimmedString(currency.id),
        toTrimmedString(currency.code) || null,
      ])
    );

    const priceGroupsByIdentifier: ProductSyncBaseFieldPresentationMetadata['priceGroupsByIdentifier'] =
      new Map();

    priceGroups.forEach((group: MongoPriceGroupDoc) => {
      const identifiersForGroup = [
        toTrimmedString(group.groupId),
        toTrimmedString(group.id),
      ].filter(Boolean);
      if (identifiersForGroup.length === 0) return;

      const name = toTrimmedString(group.name) || identifiersForGroup[0];
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
    void ErrorSystem.captureException(error);
    return new Map();
  }
};

const resolveBaseFieldPresentationMetadata = async (input: {
  connectionContext: BaseConnectionContext;
  rules: ProductSyncFieldRule[];
}): Promise<ProductSyncBaseFieldPresentationMetadata> => {
  const warehouseIdentifiers = Array.from(
    new Set(
      input.rules
        .map((rule: ProductSyncFieldRule) => getDynamicStockIdentifier(rule))
        .filter((value: string | null): value is string => typeof value === 'string' && value.length > 0)
    )
  );
  const priceGroupIdentifiers = Array.from(
    new Set(
      input.rules
        .map((rule: ProductSyncFieldRule) => getDynamicPriceGroupIdentifier(rule))
        .filter((value: string | null): value is string => typeof value === 'string' && value.length > 0)
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

const buildLinkedProductSyncPlan = (input: {
  product: ProductWithImages;
  baseRecord: Record<string, unknown> | null;
  profile: ProductSyncProfile;
  baseProductId: string;
  persistBaseProductId: boolean;
  baseFieldPresentationMetadata?: ProductSyncBaseFieldPresentationMetadata;
}): LinkedProductSyncPlan => {
  const rules = buildEffectiveProductSyncFieldRules(input.profile.fieldRules);
  const localPatch: Record<string, unknown> = {};
  const basePayload: Record<string, unknown> = {};
  const localChanges: string[] = [];
  const baseChanges: string[] = [];

  const fields = rules.map((rule: ProductSyncFieldRule): ProductSyncFieldPreview => {
    const appValue = normalizeFieldValue(rule.appField, getProductFieldValue(input.product, rule.appField));
    const baseValue = input.baseRecord
      ? normalizeFieldValue(rule.appField, resolveBaseValueByRule(rule, input.baseRecord))
      : null;
    const baseFieldPresentation = getEffectiveBaseFieldPresentation(
      rule,
      input.baseFieldPresentationMetadata
    );
    const hasDifference =
      input.baseRecord !== null ? !valuesEqual(rule.appField, appValue, baseValue) : false;
    const willWriteToApp =
      rule.direction === 'base_to_app' &&
      input.baseRecord !== null &&
      hasDifference;
    const willWriteToBase =
      rule.direction === 'app_to_base' &&
      input.baseRecord !== null &&
      hasDifference;

    if (willWriteToApp) {
      localPatch[rule.appField] = baseValue;
      localChanges.push(rule.appField);
    }

    if (willWriteToBase) {
      setPathValue(basePayload, rule.baseField, appValue);
      baseChanges.push(rule.baseField);
    }

    return {
      appField: rule.appField,
      appFieldLabel: getProductSyncAppFieldLabel(rule.appField),
      baseField: rule.baseField,
      baseFieldLabel: baseFieldPresentation.label,
      baseFieldDescription: baseFieldPresentation.description,
      direction: rule.direction,
      appValue,
      baseValue,
      hasDifference,
      willWriteToApp,
      willWriteToBase,
    };
  });

  if (input.persistBaseProductId && !toTrimmedString(input.product.baseProductId)) {
    localPatch['baseProductId'] = input.baseProductId;
    localChanges.push('baseProductId');
  }

  return {
    fields,
    localPatch,
    basePayload,
    localChanges,
    baseChanges,
  };
};

const buildBlockedSyncPreview = (input: {
  status: ProductSyncPreview['status'];
  disabledReason: string;
  profile: ProductSyncProfile | null;
  product: ProductWithImages;
  linkedBaseProductId?: string | null;
  connectionName?: string | null;
  resolvedTargetSource?: ProductSyncTargetSource;
}): ProductSyncPreview => ({
  status: input.status,
  canSync: false,
  disabledReason: input.disabledReason,
  profile: input.profile
    ? {
        id: input.profile.id,
        name: input.profile.name,
        isDefault: input.profile.isDefault,
        enabled: input.profile.enabled,
        connectionId: input.profile.connectionId,
        connectionName: input.connectionName ?? null,
        inventoryId: input.profile.inventoryId,
        catalogId: input.profile.catalogId,
        lastRunAt: input.profile.lastRunAt,
      }
    : null,
  linkedBaseProductId: toTrimmedString(input.linkedBaseProductId) || null,
  resolvedTargetSource: input.resolvedTargetSource ?? 'none',
  fields: input.profile
    ? buildLinkedProductSyncPlan({
        product: input.product,
        baseRecord: null,
        profile: input.profile,
        baseProductId: toTrimmedString(input.linkedBaseProductId) || '',
        persistBaseProductId: false,
      }).fields
    : [],
});

const toProductSyncPreviewProfile = (
  profile: ProductSyncProfile,
  options?: { connectionName?: string | null }
): ProductSyncPreview['profile'] => ({
  id: profile.id,
  name: profile.name,
  isDefault: profile.isDefault,
  enabled: profile.enabled,
  connectionId: profile.connectionId,
  connectionName: options?.connectionName ?? null,
  inventoryId: profile.inventoryId,
  catalogId: profile.catalogId,
  lastRunAt: profile.lastRunAt,
});

const summarizeRun = (stats: ProductSyncRunStats): string => {
  return `Processed ${stats.processed}/${stats.total} Base-targeted products. Success: ${stats.success}, skipped: ${stats.skipped}, failed: ${stats.failed}, local updates: ${stats.localUpdated}, Base updates: ${stats.baseUpdated}.`;
};

const resolveBaseConnectionContext = async (
  profile: ProductSyncProfile
): Promise<BaseConnectionContext> => {
  const integrationRepo = await getIntegrationRepository();
  const connection = await integrationRepo.getConnectionById(profile.connectionId);
  if (!connection) {
    throw new Error('Configured Base connection does not exist.');
  }

  const integration = await integrationRepo.getIntegrationById(connection.integrationId);
  if (
    !integration ||
    !BASE_INTEGRATION_SLUGS.has(toTrimmedString(integration.slug).toLowerCase())
  ) {
    throw new Error('Selected connection is not a Base.com integration.');
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  if (!tokenResolution.token) {
    throw new Error(tokenResolution.error ?? 'No Base API token configured.');
  }

  return {
    integrationId: integration.id,
    connectionId: connection.id,
    connectionName: toTrimmedString(connection.name) || null,
    inventoryId: profile.inventoryId,
    token: tokenResolution.token,
  };
};

const fetchBaseDetailsMap = async (
  token: string,
  inventoryId: string,
  baseProductIds: string[]
): Promise<Map<string, Record<string, unknown>>> => {
  const uniqueIds = Array.from(
    new Set(
      baseProductIds.map((id: string) => toTrimmedString(id)).filter((id: string) => id.length > 0)
    )
  );

  const map = new Map<string, Record<string, unknown>>();
  for (let offset = 0; offset < uniqueIds.length; offset += BASE_DETAILS_BATCH_SIZE) {
    const batch = uniqueIds.slice(offset, offset + BASE_DETAILS_BATCH_SIZE);
    if (batch.length === 0) continue;
    const records = await fetchBaseProductDetails(token, inventoryId, batch);
    records.forEach((record: Record<string, unknown>) => {
      const id =
        toTrimmedString(record['base_product_id']) ||
        toTrimmedString(record['product_id']) ||
        toTrimmedString(record['id']);
      if (!id) return;
      map.set(id, record);
    });
  }

  return map;
};

const resolveLinkedBaseSyncTarget = async (input: {
  product: ProductWithImages;
  connectionId: string;
}): Promise<BaseSyncResolvedTarget> => {
  const persistedBaseProductId = toTrimmedString(input.product.baseProductId);
  if (persistedBaseProductId) {
    return {
      baseProductId: persistedBaseProductId,
      linkedVia: 'product',
    };
  }

  const listingLink = await findProductListingByProductAndConnectionAcrossProviders(
    input.product.id,
    input.connectionId
  );
  const listingBaseProductId = toTrimmedString(listingLink?.listing.externalListingId);

  if (listingBaseProductId) {
    return {
      baseProductId: listingBaseProductId,
      linkedVia: 'listing',
    };
  }

  return {
    baseProductId: null,
    linkedVia: 'none',
  };
};

const resolveManualBaseSyncTarget = async (input: {
  product: ProductWithImages;
  connectionId: string;
  token: string;
  inventoryId: string;
}): Promise<BaseSyncResolvedTarget> => {
  const linkedTarget = await resolveLinkedBaseSyncTarget({
    product: input.product,
    connectionId: input.connectionId,
  });
  if (linkedTarget.baseProductId) {
    return linkedTarget;
  }

  const backfilledBaseProductId = await resolveBackfillBaseProductId({
    product: input.product,
    token: input.token,
    inventoryId: input.inventoryId,
  });
  if (backfilledBaseProductId) {
    return {
      baseProductId: backfilledBaseProductId,
      linkedVia: 'sku_backfill',
    };
  }

  return linkedTarget;
};

const resolveBatchProductSyncTargets = async (input: {
  products: ProductWithImages[];
  connectionId: string;
  token: string;
  inventoryId: string;
}): Promise<ResolvedProductSyncTarget[]> => {
  const resolvedTargets: ResolvedProductSyncTarget[] = [];

  for (const product of input.products) {
    const target = await resolveManualBaseSyncTarget({
      product,
      connectionId: input.connectionId,
      token: input.token,
      inventoryId: input.inventoryId,
    });
    if (!target.baseProductId) continue;
    resolvedTargets.push({ product, target });
  }

  return resolvedTargets;
};

const ensureBaseListingLink = async (input: {
  productId: string;
  baseProductId: string;
  integrationId: string;
  connectionId: string;
  inventoryId: string;
  source: string;
}): Promise<'created' | 'updated' | 'none'> => {
  const existing = await findProductListingByProductAndConnectionAcrossProviders(
    input.productId,
    input.connectionId
  );

  const marketplaceDataPatch = {
    source: input.source,
    marketplace: 'base',
  } as const;

  if (existing) {
    let changed = false;
    if (existing.listing.externalListingId !== input.baseProductId) {
      await existing.repository.updateListingExternalId(existing.listing.id, input.baseProductId);
      changed = true;
    }
    if ((existing.listing.inventoryId ?? '') !== input.inventoryId) {
      await existing.repository.updateListingInventoryId(existing.listing.id, input.inventoryId);
      changed = true;
    }
    if (toTrimmedString(existing.listing.status).toLowerCase() !== 'active') {
      await existing.repository.updateListingStatus(existing.listing.id, 'active');
      changed = true;
    }
    await existing.repository.updateListing(existing.listing.id, {
      marketplaceData: {
        ...(existing.listing.marketplaceData ?? {}),
        ...marketplaceDataPatch,
      },
    });
    return changed ? 'updated' : 'none';
  }

  const listingRepository = await getProductListingRepository();
  await listingRepository.createListing({
    productId: input.productId,
    integrationId: input.integrationId,
    connectionId: input.connectionId,
    status: 'active',
    externalListingId: input.baseProductId,
    inventoryId: input.inventoryId,
    marketplaceData: marketplaceDataPatch,
  });
  return 'created';
};

const resolveBackfillBaseProductId = async (input: {
  product: ProductWithImages;
  token: string;
  inventoryId: string;
}): Promise<string | null> => {
  const persistedBaseProductId = toTrimmedString(input.product.baseProductId);
  if (persistedBaseProductId) {
    return persistedBaseProductId;
  }

  if (toTrimmedString(input.product.importSource).toLowerCase() !== 'base') {
    return null;
  }

  const sku = toTrimmedString(input.product.sku);
  if (!sku) {
    return null;
  }

  const skuLookup = await checkBaseSkuExists(input.token, input.inventoryId, sku);
  return toTrimmedString(skuLookup.productId) || null;
};

const syncSingleLinkedProduct = async (input: {
  product: ProductWithImages;
  baseProductId: string;
  baseRecord: Record<string, unknown> | null;
  profile: ProductSyncProfile;
  integrationId: string;
  connectionId: string;
  inventoryId: string;
  token: string;
}): Promise<LinkedProductSyncResult> => {
  const baseProductId = toTrimmedString(input.baseProductId);
  if (!baseProductId) {
    return {
      status: 'skipped',
      localChanges: [],
      baseChanges: [],
      message: 'Product has no Base product ID.',
      errorMessage: null,
    };
  }

  if (!input.baseRecord) {
    return {
      status: 'failed',
      localChanges: [],
      baseChanges: [],
      message: null,
      errorMessage: `Base product ${baseProductId} not found in inventory ${input.inventoryId}.`,
    };
  }

  const plan = buildLinkedProductSyncPlan({
    product: input.product,
    baseRecord: input.baseRecord,
    profile: input.profile,
    baseProductId,
    persistBaseProductId: !toTrimmedString(input.product.baseProductId),
  });
  const { localPatch, basePayload, localChanges, baseChanges } = plan;

  if (localChanges.length === 0 && baseChanges.length === 0) {
    await ensureBaseListingLink({
      productId: input.product.id,
      baseProductId,
      integrationId: input.integrationId,
      connectionId: input.connectionId,
      inventoryId: input.inventoryId,
      source: 'product-sync',
    });

    return {
      status: 'skipped',
      localChanges: [],
      baseChanges: [],
      message: 'No field changes detected.',
      errorMessage: null,
    };
  }

  const productRepository = await getProductRepository();

  if (Object.keys(localPatch).length > 0) {
    const updated = await productRepository.updateProduct(
      input.product.id,
      localPatch as UpdateProductInput
    );
    if (!updated) {
      return {
        status: 'failed',
        localChanges,
        baseChanges,
        message: null,
        errorMessage: `Product ${input.product.id} was not found for local update.`,
      };
    }
  }

  if (Object.keys(basePayload).length > 0) {
    // Base updates existing inventory products via addInventoryProduct when product_id is provided.
    await callBaseApi(input.token, 'addInventoryProduct', {
      inventory_id: input.inventoryId,
      product_id: baseProductId,
      ...basePayload,
    });
  }

  await ensureBaseListingLink({
    productId: input.product.id,
    baseProductId,
    integrationId: input.integrationId,
    connectionId: input.connectionId,
    inventoryId: input.inventoryId,
    source: 'product-sync',
  });

  return {
    status: 'success',
    localChanges,
    baseChanges,
    message: 'Synchronized successfully.',
    errorMessage: null,
  };
};

export const getProductBaseSyncPreview = async (
  productId: string
): Promise<ProductSyncPreview | null> => {
  const normalizedProductId = toTrimmedString(productId);
  if (!normalizedProductId) return null;

  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(normalizedProductId);
  if (!product) return null;

  const profile = await getDefaultProductSyncProfile();
  if (!profile) {
    return buildBlockedSyncPreview({
      status: 'missing_profile',
      disabledReason:
        'No Base.com sync profile is configured. Create one in Synchronization Engine settings.',
      profile: null,
      product,
      resolvedTargetSource: 'none',
    });
  }

  let connectionContext: BaseConnectionContext;
  try {
    connectionContext = await resolveBaseConnectionContext(profile);
  } catch (error) {
    return buildBlockedSyncPreview({
      status: 'connection_error',
      disabledReason:
        error instanceof Error ? error.message : 'Base.com connection resolution failed.',
      profile,
      product,
      linkedBaseProductId: toTrimmedString(product.baseProductId) || null,
      resolvedTargetSource: toTrimmedString(product.baseProductId) ? 'product' : 'none',
    });
  }

  const resolvedTarget = await resolveManualBaseSyncTarget({
    product,
    connectionId: profile.connectionId,
    token: connectionContext.token,
    inventoryId: connectionContext.inventoryId,
  });
  if (!resolvedTarget.baseProductId) {
    return buildBlockedSyncPreview({
      status: 'missing_base_link',
      disabledReason:
        'This product is not linked to a Base.com product for the active sync profile connection.',
      profile,
      product,
      connectionName: connectionContext.connectionName,
      resolvedTargetSource: 'none',
    });
  }

  const baseRecord = (
    await fetchBaseDetailsMap(
      connectionContext.token,
      connectionContext.inventoryId,
      [resolvedTarget.baseProductId]
    )
  ).get(resolvedTarget.baseProductId) ?? null;

  if (!baseRecord) {
    return buildBlockedSyncPreview({
      status: 'missing_base_record',
      disabledReason: `Base product ${resolvedTarget.baseProductId} was not found in inventory ${connectionContext.inventoryId}.`,
      profile,
      product,
      linkedBaseProductId: resolvedTarget.baseProductId,
      connectionName: connectionContext.connectionName,
      resolvedTargetSource: resolvedTarget.linkedVia,
    });
  }

  const baseFieldPresentationMetadata = await resolveBaseFieldPresentationMetadata({
    connectionContext,
    rules: buildEffectiveProductSyncFieldRules(profile.fieldRules),
  });
  const plan = buildLinkedProductSyncPlan({
    product,
    baseRecord,
    profile,
    baseProductId: resolvedTarget.baseProductId,
    persistBaseProductId:
      resolvedTarget.linkedVia === 'listing' || resolvedTarget.linkedVia === 'sku_backfill',
    baseFieldPresentationMetadata,
  });
  const hasActiveRun = await hasActiveProductSyncRun(profile.id);

  return {
    status: hasActiveRun ? 'profile_run_active' : 'ready',
    canSync: !hasActiveRun,
    disabledReason: hasActiveRun
      ? 'A scheduled or queued sync run is already using this Base.com sync profile.'
      : null,
    profile: toProductSyncPreviewProfile(profile, {
      connectionName: connectionContext.connectionName,
    }),
    linkedBaseProductId: resolvedTarget.baseProductId,
    resolvedTargetSource: resolvedTarget.linkedVia,
    fields: plan.fields,
  };
};

export const runProductBaseSync = async (
  productId: string
): Promise<ProductSyncSingleProductResponse | null> => {
  const normalizedProductId = toTrimmedString(productId);
  if (!normalizedProductId) return null;

  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(normalizedProductId);
  if (!product) return null;

  const profile = await getDefaultProductSyncProfile();
  if (!profile) {
    throw new Error('No Base.com sync profile is configured.');
  }

  const hasActiveRun = await hasActiveProductSyncRun(profile.id);
  if (hasActiveRun) {
    throw new Error('A scheduled or queued sync run is already using this Base.com sync profile.');
  }

  const connectionContext = await resolveBaseConnectionContext(profile);
  const resolvedTarget = await resolveManualBaseSyncTarget({
    product,
    connectionId: profile.connectionId,
    token: connectionContext.token,
    inventoryId: connectionContext.inventoryId,
  });
  if (!resolvedTarget.baseProductId) {
    throw new Error(
      'This product is not linked to a Base.com product for the active sync profile connection.'
    );
  }

  const baseRecord = (
    await fetchBaseDetailsMap(
      connectionContext.token,
      connectionContext.inventoryId,
      [resolvedTarget.baseProductId]
    )
  ).get(resolvedTarget.baseProductId) ?? null;

  const result = await syncSingleLinkedProduct({
    product,
    baseProductId: resolvedTarget.baseProductId,
    baseRecord,
    profile,
    integrationId: connectionContext.integrationId,
    connectionId: connectionContext.connectionId,
    inventoryId: connectionContext.inventoryId,
    token: connectionContext.token,
  });

  const preview = await getProductBaseSyncPreview(normalizedProductId);
  if (!preview) return null;

  return {
    preview,
    result,
  };
};

export const processProductSyncRun = async (runId: string): Promise<ProductSyncRunRecord> => {
  const run = await getProductSyncRun(runId);
  if (!run) {
    throw new Error(`Product sync run not found: ${runId}`);
  }

  if (isTerminalRunStatus(run.status)) {
    return run;
  }

  const profile = await getProductSyncProfile(run.profileId);
  if (!profile) {
    return updateProductSyncRunStatus(runId, 'failed', {
      errorMessage: 'Sync profile no longer exists.',
      summaryMessage: 'Run failed because the profile was deleted.',
    });
  }

  let connectionContext: BaseConnectionContext;
  try {
    connectionContext = await resolveBaseConnectionContext(profile);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return updateProductSyncRunStatus(runId, 'failed', {
      errorMessage: error instanceof Error ? error.message : 'Connection resolution failed.',
      summaryMessage: 'Run failed during connection preflight.',
    });
  }

  await updateProductSyncRunStatus(runId, 'running', {
    errorMessage: null,
    summaryMessage: null,
    stats: {
      total: 0,
      processed: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      localUpdated: 0,
      baseUpdated: 0,
    },
  });

  const productRepository = await getProductRepository();
  const pageSize = Math.max(1, Math.min(profile.batchSize, 500));
  const stats: ProductSyncRunStats = {
    total: 0,
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    localUpdated: 0,
    baseUpdated: 0,
  };

  let page = 1;
  let itemCounter = 0;
  let lastProgressFlushProcessed = 0;
  let lastProgressFlushAtMs = Date.now();

  const flushRunProgress = async (force = false): Promise<void> => {
    const nowMs = Date.now();
    const processedDelta = stats.processed - lastProgressFlushProcessed;
    const dueToProcessedItems = processedDelta >= RUN_PROGRESS_FLUSH_EVERY_ITEMS;
    const dueToHeartbeatAge = nowMs - lastProgressFlushAtMs >= RUN_PROGRESS_FLUSH_EVERY_MS;
    if (!force && !dueToProcessedItems && !dueToHeartbeatAge) return;

    await updateProductSyncRun(runId, {
      stats: { ...stats },
      summaryMessage: summarizeRun(stats),
      errorMessage: null,
    });
    lastProgressFlushProcessed = stats.processed;
    lastProgressFlushAtMs = nowMs;
  };

  try {
    while (true) {
      const products = await productRepository.getProducts({
        page,
        pageSize,
        ...(profile.catalogId ? { catalogId: profile.catalogId } : {}),
      });

      if (products.length === 0) {
        break;
      }

      const resolvedProducts = await resolveBatchProductSyncTargets({
        products,
        connectionId: connectionContext.connectionId,
        token: connectionContext.token,
        inventoryId: connectionContext.inventoryId,
      });

      if (resolvedProducts.length > 0) {
        stats.total += resolvedProducts.length;
        const baseDetailsById = await fetchBaseDetailsMap(
          connectionContext.token,
          connectionContext.inventoryId,
          resolvedProducts
            .map(({ target }: ResolvedProductSyncTarget) => toTrimmedString(target.baseProductId))
            .filter((id: string) => id.length > 0)
        );

        for (const { product, target } of resolvedProducts) {
          const baseProductId = toTrimmedString(target.baseProductId);
          itemCounter += 1;

          try {
            const result = await syncSingleLinkedProduct({
              product,
              baseProductId,
              baseRecord: baseDetailsById.get(baseProductId) ?? null,
              profile,
              integrationId: connectionContext.integrationId,
              connectionId: connectionContext.connectionId,
              inventoryId: connectionContext.inventoryId,
              token: connectionContext.token,
            });

            stats.processed += 1;
            if (result.status === 'success') {
              stats.success += 1;
              if (result.localChanges.length > 0) stats.localUpdated += 1;
              if (result.baseChanges.length > 0) stats.baseUpdated += 1;
            } else if (result.status === 'skipped') {
              stats.skipped += 1;
            } else {
              stats.failed += 1;
            }

            const item: ProductSyncRunItemRecord = {
              id: randomUUID(),
              runId,
              itemId: String(itemCounter).padStart(8, '0'),
              productId: product.id,
              baseProductId,
              status: result.status,
              localChanges: result.localChanges,
              baseChanges: result.baseChanges,
              message: result.message,
              errorMessage: result.errorMessage,
              createdAt: nowIso(),
              updatedAt: nowIso(),
            };

            await putProductSyncRunItem(item);
            await flushRunProgress();
          } catch (error) {
            void ErrorSystem.captureException(error);
            stats.processed += 1;
            stats.failed += 1;

            const item: ProductSyncRunItemRecord = {
              id: randomUUID(),
              runId,
              itemId: String(itemCounter).padStart(8, '0'),
              productId: product.id,
              baseProductId,
              status: 'failed',
              localChanges: [],
              baseChanges: [],
              message: null,
              errorMessage:
                error instanceof Error ? error.message : 'Unexpected synchronization error.',
              createdAt: nowIso(),
              updatedAt: nowIso(),
            };

            await putProductSyncRunItem(item);
            await flushRunProgress();
          }
        }
      }

      if (products.length < pageSize) {
        break;
      }
      page += 1;
    }

    await flushRunProgress(true);

    const summaryMessage = summarizeRun(stats);
    const finalStatus: ProductSyncRunStatus =
      stats.failed === 0
        ? 'completed'
        : stats.success > 0 || stats.skipped > 0
          ? 'partial_success'
          : 'failed';

    const updatedRun = await updateProductSyncRunStatus(runId, finalStatus, {
      stats,
      summaryMessage,
      errorMessage: finalStatus === 'failed' ? summaryMessage : null,
    });

    await touchProductSyncProfileLastRunAt(profile.id, updatedRun.finishedAt ?? nowIso());

    return updatedRun;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'product-sync-service',
      action: 'processProductSyncRun',
      runId,
      profileId: profile.id,
    });

    const failed = await updateProductSyncRunStatus(runId, 'failed', {
      stats,
      summaryMessage: summarizeRun(stats),
      errorMessage: error instanceof Error ? error.message : 'Synchronization failed.',
    });

    await touchProductSyncProfileLastRunAt(profile.id, failed.finishedAt ?? nowIso());

    return failed;
  }
};

export const runBaseListingBackfill = async (options?: {
  connectionId?: string;
  inventoryId?: string;
  catalogId?: string | null;
  limit?: number;
  source?: string;
}): Promise<{
  scanned: number;
  created: number;
  updated: number;
  unchanged: number;
}> => {
  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    BASE_INTEGRATION_SLUGS.has(toTrimmedString(integration.slug).toLowerCase())
  );

  if (!baseIntegration) {
    throw new Error('Base.com integration is not configured.');
  }

  const connections = await integrationRepo.listConnections(baseIntegration.id);
  if (connections.length === 0) {
    throw new Error('No Base.com connection found.');
  }

  const preferredConnectionId =
    toTrimmedString(options?.connectionId) || toTrimmedString(await getExportDefaultConnectionId());

  const connection =
    (preferredConnectionId
      ? connections.find((entry) => entry.id === preferredConnectionId)
      : null) ??
    connections.find((entry) => Boolean(entry.baseApiToken)) ??
    connections[0];

  if (!connection) {
    throw new Error('No usable Base.com connection found.');
  }

  const inventoryId =
    toTrimmedString(options?.inventoryId) || toTrimmedString(connection.baseLastInventoryId);

  if (!inventoryId) {
    throw new Error('Inventory ID is required for link backfill.');
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });

  const productRepository = await getProductRepository();
  const pageSize = 200;
  const limit =
    typeof options?.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0
      ? Math.floor(options.limit)
      : Number.POSITIVE_INFINITY;

  let page = 1;
  let scanned = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  while (scanned < limit) {
    const products = await productRepository.getProducts({
      page,
      pageSize,
      ...(toTrimmedString(options?.catalogId)
        ? { catalogId: toTrimmedString(options?.catalogId) }
        : {}),
    });

    if (products.length === 0) break;

    for (const product of products) {
      if (scanned >= limit) break;
      const baseProductId = toTrimmedString(product.baseProductId);
      const resolvedBaseProductId =
        baseProductId ||
        (tokenResolution.token
          ? await resolveBackfillBaseProductId({
              product,
              token: tokenResolution.token,
              inventoryId,
            })
          : null);
      if (!resolvedBaseProductId) continue;

      scanned += 1;

      if (!baseProductId) {
        await productRepository.updateProduct(product.id, {
          baseProductId: resolvedBaseProductId,
        });
      }

      const result = await ensureBaseListingLink({
        productId: product.id,
        baseProductId: resolvedBaseProductId,
        integrationId: baseIntegration.id,
        connectionId: connection.id,
        inventoryId,
        source: toTrimmedString(options?.source) || 'base-link-backfill',
      });

      if (result === 'created') {
        created += 1;
      } else if (result === 'updated') {
        updated += 1;
      } else {
        unchanged += 1;
      }
    }

    if (products.length < pageSize) break;
    page += 1;
  }

  return {
    scanned,
    created,
    updated,
    unchanged,
  };
};

export const assignQueueJobToProductSyncRun = async (
  runId: string,
  queueJobId: string
): Promise<ProductSyncRunRecord> => {
  return updateProductSyncRun(runId, {
    queueJobId: toTrimmedString(queueJobId) || null,
  });
};
