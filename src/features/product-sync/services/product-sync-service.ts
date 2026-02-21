import 'server-only';

import { randomUUID } from 'crypto';

import {
  getExportDefaultConnectionId,
  getIntegrationRepository,
  getProductListingRepository,
  findProductListingByProductAndConnectionAcrossProviders,
} from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import { callBaseApi, fetchBaseProductDetails } from '@/features/integrations/services/imports/base-client';
import { ErrorSystem } from '@/features/observability/server';
import {
  getProductSyncProfile,
  getProductSyncRun,
  putProductSyncRunItem,
  touchProductSyncProfileLastRunAt,
  updateProductSyncRun,
  updateProductSyncRunStatus,
} from '@/features/product-sync/services/product-sync-repository';
import { getProductRepository } from '@/features/products/server';
import type {
  ProductSyncAppField,
  ProductSyncFieldRule,
  ProductSyncProfile,
  ProductSyncRunItemRecord,
  ProductSyncRunRecord,
  ProductSyncRunStats,
  ProductSyncRunStatus,
} from '@/shared/contracts/product-sync';
import type {
  ProductWithImagesDto as ProductWithImages,
  ProductUpdateInput,
} from '@/shared/contracts/products';

const BASE_INTEGRATION_SLUGS = new Set(['base', 'base-com', 'baselinker']);
const BASE_DETAILS_BATCH_SIZE = 100;
const RUN_PROGRESS_FLUSH_EVERY_ITEMS = 25;
const RUN_PROGRESS_FLUSH_EVERY_MS = 20_000;

type BaseConnectionContext = {
  integrationId: string;
  connectionId: string;
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

const valuesEqual = (
  appField: ProductSyncAppField,
  left: unknown,
  right: unknown
): boolean => {
  const normalizedLeft = normalizeFieldValue(appField, left);
  const normalizedRight = normalizeFieldValue(appField, right);

  if (normalizedLeft === null && normalizedRight === null) return true;
  return normalizedLeft === normalizedRight;
};

const getProductFieldValue = (
  product: ProductWithImages,
  field: ProductSyncAppField
): unknown => {
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

const setPathValue = (
  target: Record<string, unknown>,
  path: string,
  value: unknown
): void => {
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

const summarizeRun = (stats: ProductSyncRunStats): string => {
  return `Processed ${stats.processed}/${stats.total} linked products. Success: ${stats.success}, skipped: ${stats.skipped}, failed: ${stats.failed}, local updates: ${stats.localUpdated}, Base updates: ${stats.baseUpdated}.`;
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
  if (!integration || !BASE_INTEGRATION_SLUGS.has(toTrimmedString(integration.slug).toLowerCase())) {
    throw new Error('Selected connection is not a Base.com integration.');
  }

  const tokenResolution = resolveBaseConnectionToken(connection);
  if (!tokenResolution.token) {
    throw new Error(tokenResolution.error ?? 'No Base API token configured.');
  }

  return {
    integrationId: integration.id,
    connectionId: connection.id,
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
      baseProductIds
        .map((id: string) => toTrimmedString(id))
        .filter((id: string) => id.length > 0)
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
      await existing.repository.updateListingExternalId(
        existing.listing.id,
        input.baseProductId
      );
      changed = true;
    }
    if ((existing.listing.inventoryId ?? '') !== input.inventoryId) {
      await existing.repository.updateListingInventoryId(
        existing.listing.id,
        input.inventoryId
      );
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

const syncSingleLinkedProduct = async (input: {
  product: ProductWithImages;
  baseRecord: Record<string, unknown> | null;
  profile: ProductSyncProfile;
  integrationId: string;
  connectionId: string;
  inventoryId: string;
  token: string;
}): Promise<LinkedProductSyncResult> => {
  const baseProductId = toTrimmedString(input.product.baseProductId);
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

  const rules = input.profile.fieldRules.filter(
    (rule: ProductSyncFieldRule) => rule.direction !== 'disabled'
  );

  const localPatch: Record<string, unknown> = {};
  const basePayload: Record<string, unknown> = {};
  const localChanges: string[] = [];
  const baseChanges: string[] = [];

  for (const rule of rules) {
    const direction = rule.direction;

    if (direction === 'base_to_app') {
      const nextValue = normalizeFieldValue(
        rule.appField,
        resolveBaseValueByRule(rule, input.baseRecord)
      );
      if (nextValue === null) continue;

      const currentValue = getProductFieldValue(input.product, rule.appField);
      if (valuesEqual(rule.appField, currentValue, nextValue)) continue;

      localPatch[rule.appField] = nextValue;
      localChanges.push(rule.appField);
      continue;
    }

    if (direction === 'app_to_base') {
      const localValue = normalizeFieldValue(
        rule.appField,
        getProductFieldValue(input.product, rule.appField)
      );
      if (localValue === null) continue;

      const currentBaseValue = resolveBaseValueByRule(rule, input.baseRecord);
      if (valuesEqual(rule.appField, currentBaseValue, localValue)) continue;

      setPathValue(basePayload, rule.baseField, localValue);
      baseChanges.push(rule.baseField);
    }
  }

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
      localPatch as ProductUpdateInput
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

export const processProductSyncRun = async (
  runId: string
): Promise<ProductSyncRunRecord> => {
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

      const linkedProducts = products.filter((product: ProductWithImages) =>
        Boolean(toTrimmedString(product.baseProductId))
      );

      if (linkedProducts.length > 0) {
        stats.total += linkedProducts.length;
        const baseDetailsById = await fetchBaseDetailsMap(
          connectionContext.token,
          connectionContext.inventoryId,
          linkedProducts
            .map((product: ProductWithImages) => toTrimmedString(product.baseProductId))
            .filter((id: string) => id.length > 0)
        );

        for (const product of linkedProducts) {
          const baseProductId = toTrimmedString(product.baseProductId);
          itemCounter += 1;

          try {
            const result = await syncSingleLinkedProduct({
              product,
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
                error instanceof Error
                  ? error.message
                  : 'Unexpected synchronization error.',
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
    toTrimmedString(options?.connectionId) ||
    toTrimmedString(await getExportDefaultConnectionId());

  const connection =
    (preferredConnectionId
      ? connections.find((entry) => entry.id === preferredConnectionId)
      : null) ??
    connections.find((entry) => Boolean(entry.baseApiToken || entry.password)) ??
    connections[0];

  if (!connection) {
    throw new Error('No usable Base.com connection found.');
  }

  const inventoryId =
    toTrimmedString(options?.inventoryId) ||
    toTrimmedString(connection.baseLastInventoryId);

  if (!inventoryId) {
    throw new Error('Inventory ID is required for link backfill.');
  }

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
      ...(toTrimmedString(options?.catalogId) ? { catalogId: toTrimmedString(options?.catalogId) } : {}),
    });

    if (products.length === 0) break;

    for (const product of products) {
      if (scanned >= limit) break;
      const baseProductId = toTrimmedString(product.baseProductId);
      if (!baseProductId) continue;

      scanned += 1;

      const result = await ensureBaseListingLink({
        productId: product.id,
        baseProductId,
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
