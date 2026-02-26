import 'server-only';

import { getImportTemplate } from '@/features/integrations/services/import-template-repository';
import { fetchBaseProductIds } from '@/features/integrations/services/imports/base-client';
import {
  buildSummaryMessage,
  classifyBaseImportError,
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
  getBaseImportRun,
  getBaseImportRunDetail,
  listBaseImportRunItems,
  listBaseImportRuns,
  putBaseImportRunItems,
  recomputeBaseImportRunStats,
  releaseBaseImportRunLease,
  updateBaseImportRun,
  updateBaseImportRunItem,
  updateBaseImportRunStatus,
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
  shouldFilterToUniqueOnly,
  toStringId,
  type BaseConnectionContext,
  type StartBaseImportRunInput,
} from '@/features/integrations/services/imports/base-import-service-shared';
import { getCatalogRepository } from '@/features/products/services/catalog-repository';
import { getCatalogParameterLinks } from '@/features/integrations/services/imports/parameter-import/link-map-repository';
import { getParameterRepository } from '@/features/products/services/parameter-repository';
import { getProductDataProvider } from '@/features/products/services/product-provider';
import { getProductRepository } from '@/features/products/services/product-repository';
import { findProductListingsByProductsAndConnectionAcrossProviders } from '@/features/integrations/services/product-listing-repository';
import type {
  BaseImportErrorCode,
  BaseImportErrorClass,
  BaseImportItemRecord,
  BaseImportItemStatus,
  BaseImportPreflight,
  BaseImportPreflightIssue,
  BaseImportRunDetailResponse,
  BaseImportRunParams,
  BaseImportRunRecord,
} from '@/shared/contracts/integrations';
import { normalizeBaseImportParameterImportSettings } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export type { StartBaseImportRunInput };

const markRunItem = async (
  runId: string,
  item: BaseImportItemRecord,
  patch: Partial<BaseImportItemRecord>,
  options?: { recompute?: boolean }
): Promise<void> => {
  await updateBaseImportRunItem(runId, item.itemId, patch);
  if (options?.recompute !== false) {
    await recomputeBaseImportRunStats(runId);
  }
};

const buildPreflight = async (
  input: StartBaseImportRunInput,
  connection: BaseConnectionContext
): Promise<{ preflight: BaseImportPreflight; catalogExists: boolean; hasPriceGroup: boolean }> => {
  const issues: BaseImportPreflightIssue[] = [];
  const checkedAt = nowIso();

  if (!input.inventoryId?.trim()) {
    issues.push({
      code: 'PRECHECK_FAILED',
      severity: 'error',
      message: 'Inventory ID is required.',
    });
  }

  if (connection.issue) {
    issues.push(connection.issue);
  }

  const catalogRepository = await getCatalogRepository();
  const catalogs = await catalogRepository.listCatalogs();
  const targetCatalog = catalogs.find((catalog) => catalog.id === input.catalogId);
  if (!targetCatalog) {
    issues.push({
      code: 'MISSING_CATALOG',
      severity: 'error',
      message: 'Selected catalog does not exist.',
    });
  }

  let hasPriceGroup = false;
  if (targetCatalog) {
    const provider = await getProductDataProvider();
    const pricingContext = await resolvePriceGroupContext(
      provider,
      targetCatalog.defaultPriceGroupId
    );
    hasPriceGroup = Boolean(pricingContext.defaultPriceGroupId);
    if (!hasPriceGroup) {
      issues.push({
        code: 'MISSING_PRICE_GROUP',
        severity: 'error',
        message: 'Catalog default price group is not configured.',
      });
    }
  }

  if (Array.isArray(input.selectedIds) && normalizeSelectedIds(input.selectedIds).length === 0) {
    issues.push({
      code: 'PRECHECK_FAILED',
      severity: 'error',
      message: 'Select at least one Base product before importing.',
    });
  }

  return {
    preflight: {
      ok: issues.every((issue) => issue.severity !== 'error'),
      issues,
      checkedAt,
    },
    catalogExists: Boolean(targetCatalog),
    hasPriceGroup,
  };
};

const resolveRunItems = async (input: {
  token: string;
  inventoryId: string;
  selectedIds?: string[];
  limit?: number;
  uniqueOnly: boolean;
}): Promise<string[]> => {
  const selected = normalizeSelectedIds(input.selectedIds);
  let ids =
    selected.length > 0
      ? selected
      : await fetchBaseProductIds(input.token, input.inventoryId);

  if (selected.length === 0 && typeof input.limit === 'number' && input.limit > 0) {
    ids = ids.slice(0, input.limit);
  }

  if (!shouldFilterToUniqueOnly(input) || ids.length === 0) {
    return ids;
  }

  const productRepository = await getProductRepository();
  const existingProducts = await productRepository.getProducts({ page: 1, pageSize: 10_000 });
  const existingBaseIds = new Set(
    existingProducts
      .map((product: ProductWithImages) => product.baseProductId?.trim())
      .filter((value: string | undefined): value is string => Boolean(value))
  );

  return ids.filter((id: string) => !existingBaseIds.has(id));
};

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
    ...(normalizedSelectedIds.length > 0
      ? { selectedIds: normalizedSelectedIds }
      : {}),
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
    ...(normalizedParams.selectedIds
      ? { selectedIds: normalizedParams.selectedIds }
      : {}),
    ...(typeof normalizedParams.limit === 'number'
      ? { limit: normalizedParams.limit }
      : {}),
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
    runId: run.id,
    itemId,
    baseProductId: itemId,
    sku: null,
    status: 'pending',
    attempt: 0,
    idempotencyKey: `${run.id}:${itemId}`,
    action: 'pending',
    errorCode: null,
    errorClass: null,
    errorMessage: null,
    retryable: null,
    nextRetryAt: null,
    lastErrorAt: null,
    importedProductId: null,
    payloadSnapshot: null,
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    finishedAt: null,
  }));

  // Batch insert items to avoid thousands of serial database calls
  const batchSize = 1000;
  for (let i = 0; i < runItems.length; i += batchSize) {
    const batch = runItems.slice(i, i + batchSize);
    await putBaseImportRunItems(batch);
  }

  return recomputeBaseImportRunStats(run.id);
};

const failRemainingItems = async (input: {
  runId: string;
  allowedStatuses: Set<BaseImportItemStatus>;
  code: BaseImportErrorCode;
  errorClass: BaseImportErrorClass;
  retryable: boolean;
  message: string;
}): Promise<void> => {
  const items = await listBaseImportRunItems(input.runId);
  const now = nowIso();
  const toFail: BaseImportItemRecord[] = [];

  for (const item of items) {
    if (!input.allowedStatuses.has(item.status)) continue;
    toFail.push({
      ...item,
      status: 'failed',
      action: 'failed',
      errorCode: input.code,
      errorClass: input.errorClass,
      retryable: input.retryable,
      errorMessage: input.message,
      lastErrorAt: now,
      nextRetryAt: null,
      finishedAt: now,
    });
  }

  if (toFail.length > 0) {
    await putBaseImportRunItems(toFail);
  }
  await recomputeBaseImportRunStats(input.runId);
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
    options?.jobId?.trim() || `worker-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
      queueJobId: options?.jobId ?? run.queueJobId ?? null,
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
        message:
          connection.issue?.message ??
          'Base.com connection or token is missing.',
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

    const template = run.params.templateId
      ? await getImportTemplate(run.params.templateId)
      : null;
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

    const catalogLanguageContext = await resolveCatalogLanguageContext(
      provider,
      targetCatalog
    );
    const maxAttempts =
      typeof run.maxAttempts === 'number' &&
      Number.isFinite(run.maxAttempts) &&
      run.maxAttempts > 0
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
          canceledAt,
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
        batchSkus.length > 0
          ? productRepository.getProductsBySkus(batchSkus)
          : Promise.resolve([]),
      ]);

      const prefetchedProductsByBaseId = new Map<string, ProductWithImages>(
        existingByBaseIdList
          .filter((p) => p.baseProductId)
          .map((p) => [p.baseProductId!, p as ProductWithImages])
      );
      const prefetchedProductsBySku = new Map<string, ProductWithImages>(
        existingBySkuList
          .filter((p) => p.sku)
          .map((p) => [p.sku!, p as ProductWithImages])
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
          : new Map<string, { listing: Record<string, unknown>; repository: Record<string, unknown> }>();

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
                finishedAt: now,
              },
              { recompute: false }
            );
            continue;
          }

          await markRunItem(
            runId,
            item,
            {
              status: result.status,
              action: result.action,
              baseProductId: result.baseProductId ?? null,
              sku: result.sku ?? null,
              importedProductId: result.importedProductId ?? null,
              payloadSnapshot: result.payloadSnapshot ?? null,
              parameterImportSummary: result.parameterImportSummary ?? null,
              errorCode: result.errorCode ?? null,
              errorClass: result.errorClass ?? null,
              errorMessage: result.errorMessage ?? null,
              retryable: result.retryable ?? null,
              lastErrorAt: result.errorCode ? now : null,
              nextRetryAt: null,
              finishedAt: now,
            },
            { recompute: false }
          );
        } catch (error: unknown) {
          const classified = classifyBaseImportError(error);
          if (classified.retryable && attempt < maxAttempts) {
            const delayMs = computeRetryDelayMs(attempt, classified.retryAfterMs);
            await markRunItem(
              runId,
              item,
              {
                status: 'pending',
                action: 'pending',
                errorCode: classified.code,
                errorClass: classified.errorClass,
                retryable: true,
                errorMessage: classified.message,
                lastErrorAt: now,
                nextRetryAt: new Date(Date.now() + delayMs).toISOString(),
                finishedAt: now,
              },
              { recompute: false }
            );
            continue;
          }
          await markRunItem(
            runId,
            item,
            {
              status: 'failed',
              action: 'failed',
              errorCode: classified.code,
              errorClass: classified.errorClass,
              retryable: classified.retryable,
              errorMessage: classified.message,
              lastErrorAt: now,
              nextRetryAt: null,
              finishedAt: now,
            },
            { recompute: false }
          );
        }
      }

      await recomputeBaseImportRunStats(runId);
    }

    const refreshed = await recomputeBaseImportRunStats(runId);
    const pendingOrProcessing = await listBaseImportRunItems(runId, {
      limit: 100_000,
      statuses: ['pending', 'processing'],
    });
    if (pendingOrProcessing.length > 0) {
      const pendingTerminalStatus = determineBaseImportTerminalStatus(refreshed.stats, {
        hasPendingItems: true,
      });
      return updateBaseImportRunStatus(runId, pendingTerminalStatus, {
        stats: refreshed.stats,
        summaryMessage: 'Import paused with pending retry items. Resume run to continue.',
      });
    }

    const terminalStatus = determineBaseImportTerminalStatus(refreshed.stats);
    return updateBaseImportRunStatus(runId, terminalStatus, {
      stats: refreshed.stats,
      summaryMessage: buildSummaryMessage(refreshed.stats, Boolean(run.params.dryRun)),
    });
  } finally {
    await releaseBaseImportRunLease({ runId, ownerId });
  }
};

export const resumeBaseImportRun = async (
  runId: string,
  statuses: BaseImportItemStatus[] = ['failed', 'pending']
): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw notFoundError('Base import run not found.', { runId });
  }

  const allowed = new Set<BaseImportItemStatus>(statuses);
  const items = await listBaseImportRunItems(runId);
  const resumeCandidates = items.filter((item) => allowed.has(item.status));
  const resumeCount = resumeCandidates.length;

  if (resumeCount === 0) {
    throw badRequestError('No items match selected resume statuses.');
  }

  const now = nowIso();
  for (const item of resumeCandidates) {
    await updateBaseImportRunItem(runId, item.itemId, {
      status: 'pending',
      action: 'pending',
      errorCode: null,
      errorClass: null,
      errorMessage: null,
      retryable: null,
      nextRetryAt: null,
      lastErrorAt: null,
      finishedAt: null,
      startedAt: null,
    });
  }
  await recomputeBaseImportRunStats(runId);

  return updateBaseImportRun(runId, {
    status: 'queued',
    finishedAt: null,
    canceledAt: null,
    cancellationRequestedAt: null,
    lockOwnerId: null,
    lockToken: null,
    lockExpiresAt: null,
    lockHeartbeatAt: null,
    updatedAt: now,
    summaryMessage: `Resume queued for ${resumeCount} product(s).`,
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

export const updateBaseImportRunQueueJob = async (
  runId: string,
  queueJobId: string | null
): Promise<BaseImportRunRecord> => {
  return updateBaseImportRun(runId, {
    queueJobId,
  });
};

export const cancelBaseImportRun = async (
  runId: string
): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw notFoundError('Base import run not found.', { runId });
  }
  if (run.status === 'completed' || run.status === 'partial_success' || run.status === 'failed') {
    throw badRequestError('Run already finished and cannot be canceled.', { runId });
  }
  if (run.status === 'canceled') return run;
  return updateBaseImportRun(runId, {
    cancellationRequestedAt: run.cancellationRequestedAt ?? nowIso(),
    summaryMessage: 'Cancellation requested. Worker will stop shortly.',
  });
};

export const toStartResponse = (
  run: BaseImportRunRecord
): {
  runId: string;
  status: BaseImportRunRecord['status'];
  preflight: BaseImportRunRecord['preflight'];
  queueJobId?: string | null;
  summaryMessage?: string | null;
} => ({
  runId: run.id,
  status: run.status,
  preflight: run.preflight,
  queueJobId: run.queueJobId ?? null,
  summaryMessage: run.summaryMessage ?? null,
});
