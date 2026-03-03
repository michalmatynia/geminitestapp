import 'server-only';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
 
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { getImportTemplate } from '@/features/integrations/services/import-template-repository';
import {
  buildSummaryMessage,
  computeRetryDelayMs,
  determineBaseImportTerminalStatus,
} from '@/features/integrations/services/imports/base-import-error-utils';
import {
  importSingleItem,
  normalizeMappedProduct,
  pickMappedSku,
  resolveProducerAndTagLookups,
} from '@/features/integrations/services/imports/base-import-item-processor';
import {
  acquireBaseImportRunLease,
  heartbeatBaseImportRunLease,
  createBaseImportRun,
  getBaseImportRunDetail,
  getBaseImportRun,
  listBaseImportRunItems,
  listBaseImportRuns,
  putBaseImportRunItems,
  recomputeBaseImportRunStats,
  requestBaseImportRunCancellation,
  updateBaseImportRun,
  updateBaseImportRunStatus,
  releaseBaseImportRunLease,
} from '@/features/integrations/services/imports/base-import-run-repository';
import {
  fetchDetailsMap,
  resolveBaseConnectionContext,
  resolveCatalogLanguageContext,
  resolvePriceGroupContext,
} from '@/features/integrations/services/imports/base-import-service-context';
import {
  BASE_IMPORT_HEARTBEAT_EVERY_ITEMS,
  BASE_IMPORT_LEASE_MS,
  BASE_IMPORT_MAX_ATTEMPTS,
  createRunIdempotencyKey,
  normalizeSelectedIds,
  nowIso,
  resolveMode,
  shouldReuseIdempotentRun,
  toStringId,
} from '@/features/integrations/services/imports/base-import-service-shared';
import { getCatalogRepository } from '@/shared/lib/products/services/catalog-repository';
import { getCatalogParameterLinks } from '@/features/integrations/services/imports/parameter-import/link-map-repository';
import { getParameterRepository } from '@/shared/lib/products/services/parameter-repository';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { findProductListingsByProductsAndConnectionAcrossProviders } from '@/features/integrations/services/product-listing-repository';
import type {
  BaseImportRunDetailResponse,
  BaseImportItemRecord,
  BaseImportItemStatus,
  BaseImportRunParams,
  BaseImportRunRecord,
  BaseImportStartResponse,
  ProductListing,
  ProductListingRepository,
  StartBaseImportRunInput,
} from '@/shared/contracts/integrations';
import { normalizeBaseImportParameterImportSettings } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

import { buildPreflight } from './base-import/preflight';
import { resolveRunItems } from './base-import/run-items';
import { markRunItem, failRemainingItems } from './base-import/processor';

export type { StartBaseImportRunInput };

const BASE_IMPORT_TERMINAL_STATUSES = new Set([
  'completed',
  'partial_success',
  'failed',
  'canceled',
]);

const BASE_IMPORT_RESUME_DEFAULT_STATUSES: BaseImportItemStatus[] = ['failed', 'pending'];

export const prepareBaseImportRun = async (
  input: StartBaseImportRunInput
): Promise<BaseImportRunRecord> => {
  const normalizedConnectionId = input.connectionId?.trim() || '';
  const normalizedTemplateId = input.templateId?.trim() || '';
  const normalizedRequestId = input.requestId?.trim() || '';
  const normalizedSelectedIds = normalizeSelectedIds(input.selectedIds);
  const normalizedLimit =
    typeof input.limit === 'number' && Number.isFinite(input.limit)
      ? Math.max(1, Math.floor(input.limit))
      : null;

  const normalizedParams: BaseImportRunParams = {
    inventoryId: input.inventoryId.trim(),
    catalogId: input.catalogId.trim(),
    imageMode: input.imageMode,
    uniqueOnly: input.uniqueOnly,
    allowDuplicateSku: input.allowDuplicateSku,
    dryRun: input.dryRun ?? false,
    mode: resolveMode(input.mode),
    ...(normalizedConnectionId ? { connectionId: normalizedConnectionId } : {}),
    ...(normalizedTemplateId ? { templateId: normalizedTemplateId } : {}),
    ...(normalizedLimit !== null ? { limit: normalizedLimit } : {}),
    ...(normalizedSelectedIds.length > 0 ? { selectedIds: normalizedSelectedIds } : {}),
    ...(normalizedRequestId ? { requestId: normalizedRequestId } : {}),
  };

  const connection = await resolveBaseConnectionContext(normalizedParams.connectionId);
  const preflightResult = await buildPreflight(input, connection);

  if (!preflightResult.preflight.ok || !connection.token) {
    return createBaseImportRun({
      params: normalizedParams,
      preflight: preflightResult.preflight,
      summaryMessage: 'Preflight failed. Resolve errors and retry import.',
      totalItems: 0,
      maxAttempts: BASE_IMPORT_MAX_ATTEMPTS,
    });
  }

  const ids = await resolveRunItems({
    token: connection.token,
    inventoryId: normalizedParams.inventoryId,
    uniqueOnly: normalizedParams.uniqueOnly,
    ...(normalizedParams.selectedIds ? { selectedIds: normalizedParams.selectedIds } : {}),
    ...(typeof normalizedParams.limit === 'number' ? { limit: normalizedParams.limit } : {}),
  });

  const idempotencyKey = createRunIdempotencyKey(normalizedParams, ids);

  const recentRuns = await listBaseImportRuns(100);
  const existing = recentRuns.find((run) => {
    if (run.idempotencyKey !== idempotencyKey) return false;
    if (!shouldReuseIdempotentRun(run.status)) return false;
    const createdAtMs = new Date(run.createdAt).getTime();
    if (!Number.isFinite(createdAtMs)) return false;
    return Date.now() - createdAtMs < 30 * 60_000;
  });

  if (existing) {
    return existing;
  }

  const run = await createBaseImportRun({
    params: normalizedParams,
    preflight: preflightResult.preflight,
    idempotencyKey,
    totalItems: ids.length,
    maxAttempts: BASE_IMPORT_MAX_ATTEMPTS,
    summaryMessage:
      ids.length === 0
        ? 'No products matched current import filters.'
        : `Queued ${ids.length} products for import.`,
  });

  if (ids.length === 0) {
    return updateBaseImportRunStatus(run.id, 'completed', {
      stats: {
        total: 0,
        pending: 0,
        processing: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
      summaryMessage: 'No products matched current import filters.',
      finishedAt: nowIso(),
    });
  }

  const createdAt = nowIso();
  const runItems: BaseImportItemRecord[] = ids.map((itemId) => ({
    id: itemId,
    runId: run.id,
    externalId: itemId,
    itemId,
    baseProductId: itemId,
    sku: null,
    status: 'pending',
    attempt: 0,
    idempotencyKey: `${run.id}:${itemId}`,
    action: 'pending',
    productId: null,
    importedProductId: null,
    error: null,
    errorMessage: null,
    errorCode: null,
    errorClass: null,
    retryable: null,
    nextRetryAt: null,
    lastErrorAt: null,
    payloadSnapshot: null,
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    finishedAt: null,
    parameterImportSummary: null,
  }));

  // Batch insert items to avoid thousands of serial database calls
  const batchSize = 1000;
  for (let i = 0; i < runItems.length; i += batchSize) {
    const batch = runItems.slice(i, i + batchSize);
    await putBaseImportRunItems(batch);
  }

  return recomputeBaseImportRunStats(run.id);
};

export const toStartResponse = (run: BaseImportRunRecord): BaseImportStartResponse => ({
  runId: run.id,
  status: run.status,
  ...(run.preflight !== undefined ? { preflight: run.preflight ?? null } : {}),
  queueJobId: run.queueJobId ?? null,
  summaryMessage: run.summaryMessage ?? null,
});

export const updateBaseImportRunQueueJob = async (
  runId: string,
  queueJobId: string | null
): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw notFoundError('Base import run not found.', { runId });
  }
  const normalizedQueueJobId = queueJobId?.trim() || null;
  return updateBaseImportRun(runId, {
    queueJobId: normalizedQueueJobId,
  });
};

export const resumeBaseImportRun = async (
  runId: string,
  statuses?: BaseImportItemStatus[]
): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw notFoundError('Base import run not found.', { runId });
  }
  const resumeStatuses =
    Array.isArray(statuses) && statuses.length > 0
      ? statuses
      : BASE_IMPORT_RESUME_DEFAULT_STATUSES;
  const itemsToResume = await listBaseImportRunItems(runId, {
    limit: 100_000,
    statuses: resumeStatuses,
  });
  if (itemsToResume.length === 0) {
    return updateBaseImportRun(runId, {
      cancellationRequestedAt: null,
      summaryMessage: 'No matching items found to resume.',
    });
  }

  const now = nowIso();
  const resetItems = itemsToResume.map(
    (item): BaseImportItemRecord => ({
      ...item,
      status: 'pending',
      action: 'pending',
      attempt: 0,
      error: null,
      errorMessage: null,
      errorCode: null,
      errorClass: null,
      retryable: null,
      nextRetryAt: null,
      lastErrorAt: null,
      startedAt: null,
      finishedAt: null,
      updatedAt: now,
    })
  );
  await putBaseImportRunItems(resetItems);
  await recomputeBaseImportRunStats(runId);

  return updateBaseImportRun(runId, {
    status: 'queued',
    queueJobId: null,
    lockOwnerId: null,
    lockToken: null,
    lockExpiresAt: null,
    lockHeartbeatAt: null,
    cancellationRequestedAt: null,
    startedAt: null,
    finishedAt: null,
    error: null,
    errorCode: null,
    errorClass: null,
    summaryMessage: `Queued ${resetItems.length} item(s) for resume.`,
  });
};

export const cancelBaseImportRun = async (runId: string): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw notFoundError('Base import run not found.', { runId });
  }
  if (BASE_IMPORT_TERMINAL_STATUSES.has(run.status)) {
    return run;
  }

  const cancellationRequested = await requestBaseImportRunCancellation(runId);
  if (cancellationRequested.status === 'running' && cancellationRequested.lockOwnerId) {
    return cancellationRequested;
  }

  await failRemainingItems({
    runId,
    allowedStatuses: new Set<BaseImportItemStatus>(['pending', 'processing']),
    code: 'CANCELED',
    errorClass: 'canceled',
    retryable: false,
    message: 'Run canceled by user request.',
  });

  return updateBaseImportRunStatus(runId, 'canceled', {
    queueJobId: null,
    lockOwnerId: null,
    lockToken: null,
    lockExpiresAt: null,
    lockHeartbeatAt: null,
    summaryMessage: 'Import canceled.',
  });
};

export const getBaseImportRunDetailOrThrow = async (
  runId: string,
  options?: {
    statuses?: BaseImportItemStatus[];
    page?: number;
    pageSize?: number;
    includeItems?: boolean;
  }
): Promise<BaseImportRunDetailResponse> => {
  const detail = await getBaseImportRunDetail(runId, options);
  if (!detail) {
    throw notFoundError('Base import run not found.', { runId });
  }
  return detail;
};

export const processBaseImportRun = async (
  runId: string,
  options?: {
    allowedStatuses?: BaseImportItemStatus[];
    jobId?: string;
  }
): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw notFoundError('Base import run not found.', { runId });
  }

  const allowedStatuses = new Set<BaseImportItemStatus>(
    options?.allowedStatuses && options.allowedStatuses.length > 0
      ? options.allowedStatuses
      : ['pending']
  );
  const ownerId =
    options?.jobId?.trim() ||
    `worker-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const lease = await acquireBaseImportRunLease({
    runId,
    ownerId,
    leaseMs: BASE_IMPORT_LEASE_MS,
  });
  if (!lease.acquired) {
    if (lease.run) return lease.run;
    throw badRequestError('Import run is locked by another worker.', { runId });
  }

  const getDueItems = (items: BaseImportItemRecord[], nowMs: number): BaseImportItemRecord[] =>
    items.filter((item: BaseImportItemRecord): boolean => {
      if (!allowedStatuses.has(item.status)) return false;
      if (item.status !== 'pending') return true;
      if (!item.nextRetryAt) return true;
      const retryAt = Date.parse(item.nextRetryAt);
      if (!Number.isFinite(retryAt)) return true;
      return retryAt <= nowMs;
    });

  const getNextRetryTimestamp = (items: BaseImportItemRecord[]): number | null => {
    let next: number | null = null;
    items.forEach((item: BaseImportItemRecord): void => {
      if (item.status !== 'pending' || !allowedStatuses.has(item.status)) return;
      if (!item.nextRetryAt) return;
      const retryAt = Date.parse(item.nextRetryAt);
      if (!Number.isFinite(retryAt)) return;
      if (next === null || retryAt < next) next = retryAt;
    });
    return next;
  };

  let processedItemsSinceHeartbeat = 0;

  try {
    const initialItems = await listBaseImportRunItems(runId, {
      limit: 100_000,
      statuses: Array.from(allowedStatuses),
    });
    if (initialItems.length === 0) {
      const refreshed = await recomputeBaseImportRunStats(runId);
      const alreadyFinished =
        refreshed.status === 'completed' ||
        refreshed.status === 'partial_success' ||
        refreshed.status === 'failed' ||
        refreshed.status === 'canceled';
      if (alreadyFinished) return refreshed;
      return updateBaseImportRunStatus(runId, 'completed', {
        summaryMessage: buildSummaryMessage(refreshed.stats, Boolean(run.params.dryRun)),
      });
    }

    await updateBaseImportRunStatus(runId, 'running', {
      queueJobId: options?.jobId ?? (run as any).queueJobId ?? null,
      summaryMessage: `Processing ${initialItems.length} product(s).`,
      cancellationRequestedAt: run.cancellationRequestedAt ?? null,
    });

    const connection = await resolveBaseConnectionContext(run.params.connectionId);
    if (!connection.token || !connection.connectionId || !connection.baseIntegrationId) {
      await failRemainingItems({
        runId,
        allowedStatuses,
        code: 'MISSING_CONNECTION',
        errorClass: 'configuration',
        retryable: false,
        message: connection.issue?.message ?? 'Base.com connection or token is missing.',
      });
      return updateBaseImportRunStatus(runId, 'failed', {
        summaryMessage: 'Import failed: Base.com connection is not available.',
      });
    }

    const catalogRepository = await getCatalogRepository();
    const catalogs = await catalogRepository.listCatalogs();
    const targetCatalog = catalogs.find((catalog) => catalog.id === run.params.catalogId);
    if (!targetCatalog) {
      await failRemainingItems({
        runId,
        allowedStatuses,
        code: 'MISSING_CATALOG',
        errorClass: 'configuration',
        retryable: false,
        message: 'Selected catalog no longer exists.',
      });
      return updateBaseImportRunStatus(runId, 'failed', {
        summaryMessage: 'Import failed: selected catalog no longer exists.',
      });
    }

    const provider = await getProductDataProvider();
    const pricingContext = await resolvePriceGroupContext(
      provider,
      targetCatalog.defaultPriceGroupId
    );
    if (!pricingContext.defaultPriceGroupId) {
      await failRemainingItems({
        runId,
        allowedStatuses,
        code: 'MISSING_PRICE_GROUP',
        errorClass: 'configuration',
        retryable: false,
        message: 'Catalog default price group is missing.',
      });
      return updateBaseImportRunStatus(runId, 'failed', {
        summaryMessage: 'Import failed: configure catalog default price group.',
      });
    }

    const template = run.params.templateId ? await getImportTemplate(run.params.templateId) : null;
    const templateMappings = Array.isArray(template?.mappings) ? template.mappings : [];
    const templateParameterImportSettings = normalizeBaseImportParameterImportSettings(
      template?.parameterImport
    );
    const lookups = await resolveProducerAndTagLookups(connection.connectionId);
    const productRepository = await getProductRepository();
    const parameterRepository = await getParameterRepository();

    // Performance optimization: pre-fetch catalog context once per run
    const [prefetchedParameters, prefetchedLinks] = await Promise.all([
      parameterRepository.listParameters({ catalogId: targetCatalog.id }),
      templateParameterImportSettings.matchBy === 'base_id_then_name'
        ? getCatalogParameterLinks({
          catalogId: targetCatalog.id,
          connectionId: connection.connectionId,
          inventoryId: run.params.inventoryId,
        })
        : Promise.resolve({}),
    ]);

    const catalogLanguageContext = await resolveCatalogLanguageContext(provider, targetCatalog);
    const maxAttempts =
      typeof run.maxAttempts === 'number' && Number.isFinite(run.maxAttempts) && run.maxAttempts > 0
        ? Math.floor(run.maxAttempts)
        : BASE_IMPORT_MAX_ATTEMPTS;

    while (true) {
      const currentRun = await getBaseImportRun(runId);
      if (!currentRun) {
        throw notFoundError('Base import run not found.', { runId });
      }
      if (currentRun.cancellationRequestedAt) {
        await failRemainingItems({
          runId,
          allowedStatuses: new Set<BaseImportItemStatus>(['pending', 'processing']),
          code: 'CANCELED',
          errorClass: 'canceled',
          retryable: false,
          message: 'Run canceled by user request.',
        });
        const canceledAt = nowIso();
        return updateBaseImportRunStatus(runId, 'canceled', {
          finishedAt: canceledAt,
          summaryMessage: 'Import canceled.',
        });
      }

      const candidates = await listBaseImportRunItems(runId, {
        limit: 100_000,
        statuses: Array.from(allowedStatuses),
      });
      const nowMs = Date.now();
      const dueItems = getDueItems(candidates, nowMs);
      if (dueItems.length === 0) {
        const nextRetryAtMs = getNextRetryTimestamp(candidates);
        if (nextRetryAtMs !== null) {
          const waitMs = nextRetryAtMs - nowMs;
          if (waitMs > 0 && waitMs <= 5_000) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
          }
        }
        break;
      }

      const detailsMap = await fetchDetailsMap(
        connection.token,
        run.params.inventoryId,
        dueItems.map((item: BaseImportItemRecord): string => item.itemId)
      );

      // Performance optimization: batch pre-fetch existing products
      const batchBaseProductIds: string[] = [];
      const batchSkus: string[] = [];
      dueItems.forEach((item) => {
        const raw = detailsMap.get(item.itemId);
        if (!raw) return;
        const mapped = normalizeMappedProduct(
          raw,
          templateMappings,
          pricingContext.preferredCurrencies
        );
        const baseId =
          mapped.baseProductId?.trim() ||
          toStringId(raw['base_product_id']) ||
          toStringId(raw['product_id']) ||
          toStringId(raw['id']);
        const sku = pickMappedSku(mapped);
        if (baseId) batchBaseProductIds.push(baseId);
        if (sku) batchSkus.push(sku);
      });

      const [existingByBaseIdList, existingBySkuList] = await Promise.all([
        batchBaseProductIds.length > 0
          ? productRepository.findProductsByBaseIds(batchBaseProductIds)
          : Promise.resolve([]),
        batchSkus.length > 0 ? productRepository.getProductsBySkus(batchSkus) : Promise.resolve([]),
      ]);

      const prefetchedProductsByBaseId = new Map<string, ProductWithImages>(
        existingByBaseIdList
          .filter((p) => p.baseProductId)
          .map((p) => [p.baseProductId!, p as ProductWithImages])
      );
      const prefetchedProductsBySku = new Map<string, ProductWithImages>(
        existingBySkuList.filter((p) => p.sku).map((p) => [p.sku!, p as ProductWithImages])
      );

      // Performance optimization: pre-fetch listings for this batch
      const allProductIdsForBatch = new Set<string>();
      existingByBaseIdList.forEach((p) => allProductIdsForBatch.add(p.id));
      existingBySkuList.forEach((p) => allProductIdsForBatch.add(p.id));

      const prefetchedListings =
        allProductIdsForBatch.size > 0
          ? await findProductListingsByProductsAndConnectionAcrossProviders(
            Array.from(allProductIdsForBatch),
            connection.connectionId
          )
          : new Map<string, { listing: ProductListing; repository: ProductListingRepository }>();

      for (const item of dueItems) {
        processedItemsSinceHeartbeat += 1;
        if (processedItemsSinceHeartbeat >= BASE_IMPORT_HEARTBEAT_EVERY_ITEMS) {
          processedItemsSinceHeartbeat = 0;
          const heartbeat = await heartbeatBaseImportRunLease({
            runId,
            ownerId,
            leaseMs: BASE_IMPORT_LEASE_MS,
          });
          if (!heartbeat) {
            throw badRequestError('Import lease expired while processing run.', { runId });
          }
        }

        const now = nowIso();
        const attempt = item.attempt + 1;
        await markRunItem(
          runId,
          item,
          {
            status: 'processing',
            action: 'processing',
            attempt,
            startedAt: now,
            errorCode: null,
            errorClass: null,
            errorMessage: null,
            retryable: null,
            nextRetryAt: null,
          },
          { recompute: false }
        );

        const raw = detailsMap.get(item.itemId);
        if (!raw) {
          await markRunItem(
            runId,
            item,
            {
              status: 'failed',
              action: 'failed',
              errorCode: 'NOT_FOUND',
              errorClass: 'permanent',
              retryable: false,
              errorMessage: `Base product ${item.itemId} not found.`,
              lastErrorAt: now,
              nextRetryAt: null,
              finishedAt: now,
            },
            { recompute: false }
          );
          continue;
        }

        try {
          const result = await importSingleItem({
            run,
            item,
            raw,
            baseIntegrationId: connection.baseIntegrationId,
            connectionId: connection.connectionId,
            token: connection.token,
            targetCatalogId: targetCatalog.id,
            defaultPriceGroupId: pricingContext.defaultPriceGroupId,
            preferredPriceCurrencies: pricingContext.preferredCurrencies,
            lookups,
            templateMappings,
            productRepository,
            parameterRepository,
            imageMode: run.params.imageMode,
            dryRun: Boolean(run.params.dryRun),
            inventoryId: run.params.inventoryId,
            mode: resolveMode(run.params.mode),
            allowDuplicateSku: run.params.allowDuplicateSku,
            parameterImportSettings: templateParameterImportSettings,
            catalogLanguageCodes: catalogLanguageContext.languageCodes,
            defaultLanguageCode: catalogLanguageContext.defaultLanguageCode,
            prefetchedParameters,
            prefetchedLinks,
            prefetchedProductsByBaseId,
            prefetchedProductsBySku,
            prefetchedListings,
          });

          const retryableResult = result.status === 'failed' && result.retryable === true;
          if (retryableResult && attempt < maxAttempts) {
            const delayMs = computeRetryDelayMs(attempt);
            await markRunItem(
              runId,
              item,
              {
                status: 'pending',
                action: 'pending',
                baseProductId: result.baseProductId ?? null,
                sku: result.sku ?? null,
                importedProductId: result.importedProductId ?? null,
                payloadSnapshot: result.payloadSnapshot ?? null,
                parameterImportSummary: result.parameterImportSummary ?? null,
                errorCode: result.errorCode ?? null,
                errorClass: result.errorClass ?? 'transient',
                errorMessage: result.errorMessage ?? 'Retry scheduled.',
                retryable: true,
                lastErrorAt: now,
                nextRetryAt: new Date(Date.now() + delayMs).toISOString(),
              },
              { recompute: true }
            );
          } else {
            await markRunItem(runId, item, result, { recompute: true });
          }
        } catch (error: unknown) {
          const delayMs = computeRetryDelayMs(attempt);
          const isRetryable = attempt < maxAttempts;
          const status: BaseImportItemStatus = isRetryable ? 'pending' : 'failed';
          await markRunItem(
            runId,
            item,
            {
              status,
              action: status === 'pending' ? 'pending' : 'failed',
              errorCode: 'INTERNAL_ERROR',
              errorClass: 'permanent',
              errorMessage: error instanceof Error ? error.message : String(error),
              retryable: isRetryable,
              lastErrorAt: now,
              nextRetryAt: isRetryable ? new Date(Date.now() + delayMs).toISOString() : null,
              finishedAt: isRetryable ? null : now,
            },
            { recompute: true }
          );
        }
      }
    }

    const finalStats = await recomputeBaseImportRunStats(runId);
    const terminalStatus = determineBaseImportTerminalStatus(finalStats.stats);
    return updateBaseImportRunStatus(runId, terminalStatus, {
      finishedAt: nowIso(),
      summaryMessage: buildSummaryMessage(finalStats.stats, Boolean(run.params.dryRun)),
    });
  } finally {
    await releaseBaseImportRunLease({ runId, ownerId });
  }
};
