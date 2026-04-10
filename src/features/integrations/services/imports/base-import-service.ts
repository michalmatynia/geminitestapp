import 'server-only';

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
  BASE_IMPORT_PROCESSING_BATCH_SIZE,
  BASE_IMPORT_PROCESSING_SCAN_PAGE_SIZE,
  type StartBaseImportRunInput,
  createRunIdempotencyKey,
  isExactTargetImport,
  normalizeDirectTarget,
  normalizeSelectedIds,
  nowIso,
  resolveEffectiveMode,
  shouldReuseIdempotentRun,
  toStringId,
} from '@/features/integrations/services/imports/base-import-service-shared';
import { getCatalogParameterLinks } from '@/features/integrations/services/imports/parameter-import/link-map-repository';
import { findProductListingsByProductsAndConnectionAcrossProviders } from '@/features/integrations/services/product-listing-repository';
import type { BaseImportRunDetailResponse, BaseImportItemRecord, BaseImportItemStatus, BaseImportRunParams, BaseImportRunRecord, BaseImportStartResponse } from '@/shared/contracts/integrations/base-com';
import type { ProductListing } from '@/shared/contracts/integrations/listings';
import type { ProductListingRepository } from '@/shared/contracts/integrations/repositories';
import { normalizeBaseImportParameterImportSettings } from '@/shared/contracts/integrations/parameter-import';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { getCatalogRepository } from '@/shared/lib/products/services/catalog-repository';
import { getCustomFieldRepository } from '@/shared/lib/products/services/custom-field-repository';
import { getParameterRepository } from '@/shared/lib/products/services/parameter-repository';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

import { buildPreflight } from './base-import/preflight';
import { markRunItem, failRemainingItems } from './base-import/processor';
import { resolveRunItems } from './base-import/run-items';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export type { StartBaseImportRunInput };

const BASE_IMPORT_TERMINAL_STATUSES = new Set([
  'completed',
  'partial_success',
  'failed',
  'canceled',
]);

const BASE_IMPORT_RESUME_DEFAULT_STATUSES: BaseImportItemStatus[] = ['failed', 'pending'];
const BASE_IMPORT_RETRY_WAIT_WINDOW_MS = 5_000;

const toFailureTimestamp = (item: BaseImportItemRecord): number => {
  const candidates = [item.lastErrorAt, item.finishedAt, item.updatedAt];
  for (const value of candidates) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const pickLatestFailedImportItem = (
  items: BaseImportItemRecord[]
): BaseImportItemRecord | null => {
  if (items.length === 0) return null;
  return [...items].sort((left, right) => toFailureTimestamp(right) - toFailureTimestamp(left))[0] ?? null;
};

const findLatestFailedImportItem = async (
  runId: string
): Promise<BaseImportItemRecord | null> => {
  let latest: BaseImportItemRecord | null = null;
  let offset = 0;

  while (true) {
    const listedPage = await listBaseImportRunItems(runId, {
      limit: BASE_IMPORT_PROCESSING_SCAN_PAGE_SIZE,
      offset,
    });
    const page = Array.isArray(listedPage) ? listedPage : [];
    if (page.length === 0) break;

    const failedItems = page.filter((item): boolean => item.status === 'failed');
    latest = pickLatestFailedImportItem([...(latest ? [latest] : []), ...failedItems]);

    offset += page.length;
    if (page.length < BASE_IMPORT_PROCESSING_SCAN_PAGE_SIZE) break;
  }

  return latest;
};

const toCompactFailureMessage = (value: string | null | undefined, maxLength = 220): string => {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const formatLatestFailureSummary = (item: BaseImportItemRecord | null): string | null => {
  if (!item) return null;
  const subject = item.sku?.trim() || item.itemId?.trim() || item.baseProductId?.trim() || 'item';
  const code = item.errorCode?.trim() || '';
  const message = toCompactFailureMessage(item.errorMessage);
  if (!code && !message) return null;
  if (!message) return `Latest failure: ${subject}${code ? ` [${code}]` : ''}`;
  return `Latest failure: ${subject}${code ? ` [${code}]` : ''}: ${message}`;
};

const formatExactTargetItemSummary = (input: {
  run: BaseImportRunRecord;
  item: BaseImportItemRecord | null;
}): string | null => {
  const directTarget = input.run.params.directTarget;
  const item = input.item;
  if (!directTarget || !item) return null;

  const targetLabel =
    directTarget.type === 'sku'
      ? `SKU ${directTarget.value}`
      : `Base Product ID ${directTarget.value}`;
  const productReference = item.importedProductId?.trim()
    ? ` product ${item.importedProductId.trim()}`
    : ' product';
  const importedSkuReference = item.sku?.trim() ? ` with SKU ${item.sku.trim()}` : '';

  if (item.status === 'imported') {
    return `Exact target ${targetLabel} created new Base-linked${productReference}${importedSkuReference}.`;
  }

  if (item.status === 'updated') {
    return `Exact target ${targetLabel} updated existing${productReference}.`;
  }

  if (item.status === 'skipped') {
    const message = toCompactFailureMessage(item.errorMessage, 160);
    return message
      ? `Exact target ${targetLabel} was skipped: ${message}`
      : `Exact target ${targetLabel} was skipped.`;
  }

  return null;
};

type DueBaseImportRunItemBatch = {
  dueItems: BaseImportItemRecord[];
  nextOffset: number;
  nextRetryAtMs: number | null;
  reachedEnd: boolean;
};

const toRetryTimestamp = (item: BaseImportItemRecord): number | null => {
  if (!item.nextRetryAt) return null;
  const retryAt = Date.parse(item.nextRetryAt);
  return Number.isFinite(retryAt) ? retryAt : null;
};

const isBaseImportRunItemDue = (item: BaseImportItemRecord, nowMs: number): boolean => {
  if (item.status !== 'pending') return true;
  const retryAt = toRetryTimestamp(item);
  return retryAt === null || retryAt <= nowMs;
};

const listDueBaseImportRunItemBatch = async (input: {
  runId: string;
  allowedStatuses: Set<BaseImportItemStatus>;
  nowMs: number;
  offset: number;
}): Promise<DueBaseImportRunItemBatch> => {
  const dueItems: BaseImportItemRecord[] = [];
  let nextRetryAtMs: number | null = null;
  let offset = input.offset;
  let reachedEnd = false;

  while (dueItems.length < BASE_IMPORT_PROCESSING_BATCH_SIZE) {
    const listedPage = await listBaseImportRunItems(input.runId, {
      limit: BASE_IMPORT_PROCESSING_SCAN_PAGE_SIZE,
      offset,
    });
    const page = Array.isArray(listedPage) ? listedPage : [];
    if (page.length === 0) {
      reachedEnd = true;
      break;
    }

    let pageCursor = 0;

    for (const item of page) {
      pageCursor += 1;
      if (!input.allowedStatuses.has(item.status)) continue;

      if (isBaseImportRunItemDue(item, input.nowMs)) {
        dueItems.push(item);
        if (dueItems.length >= BASE_IMPORT_PROCESSING_BATCH_SIZE) break;
        continue;
      }

      const retryAt = toRetryTimestamp(item);
      if (retryAt !== null && (nextRetryAtMs === null || retryAt < nextRetryAtMs)) {
        nextRetryAtMs = retryAt;
      }
    }

    offset += pageCursor;
    if (page.length < BASE_IMPORT_PROCESSING_SCAN_PAGE_SIZE) {
      reachedEnd = true;
      break;
    }
  }

  return { dueItems, nextOffset: offset, nextRetryAtMs, reachedEnd };
};

export const prepareBaseImportRun = async (
  input: StartBaseImportRunInput
): Promise<BaseImportRunRecord> => {
  const normalizedConnectionId = input.connectionId.trim();
  if (!normalizedConnectionId) {
    throw badRequestError('Base.com connection is required.');
  }
  const normalizedTemplateId = input.templateId?.trim() || '';
  const normalizedRequestId = input.requestId?.trim() || '';
  const normalizedSelectedIds = normalizeSelectedIds(input.selectedIds);
  const normalizedDirectTarget = normalizeDirectTarget(input.directTarget);
  const normalizedLimit =
    typeof input.limit === 'number' && Number.isFinite(input.limit)
      ? Math.max(1, Math.floor(input.limit))
      : null;

  const normalizedParams: BaseImportRunParams = {
    connectionId: normalizedConnectionId,
    inventoryId: input.inventoryId.trim(),
    catalogId: input.catalogId.trim(),
    imageMode: input.imageMode,
    uniqueOnly: input.uniqueOnly,
    allowDuplicateSku: input.allowDuplicateSku,
    dryRun: input.dryRun ?? false,
    mode: resolveEffectiveMode({
      mode: input.mode,
      directTarget: normalizedDirectTarget,
    }),
    ...(normalizedTemplateId ? { templateId: normalizedTemplateId } : {}),
    ...(normalizedLimit !== null ? { limit: normalizedLimit } : {}),
    ...(normalizedSelectedIds.length > 0 ? { selectedIds: normalizedSelectedIds } : {}),
    ...(normalizedDirectTarget ? { directTarget: normalizedDirectTarget } : {}),
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

  const resolvedItems = await resolveRunItems({
    token: connection.token,
    inventoryId: normalizedParams.inventoryId,
    uniqueOnly: normalizedParams.uniqueOnly,
    ...(normalizedParams.selectedIds ? { selectedIds: normalizedParams.selectedIds } : {}),
    ...(normalizedParams.directTarget ? { directTarget: normalizedParams.directTarget } : {}),
    ...(typeof normalizedParams.limit === 'number' ? { limit: normalizedParams.limit } : {}),
  });
  const ids = resolvedItems.ids;

  if (normalizedParams.directTarget && ids.length === 0) {
    return createBaseImportRun({
      params: normalizedParams,
      preflight: {
        ...preflightResult.preflight,
        ok: false,
        issues: [
          ...preflightResult.preflight.issues,
          {
            code: 'NOT_FOUND',
            severity: 'error',
            message:
              resolvedItems.resolutionError ??
              'The requested Base product could not be resolved in the selected inventory.',
          },
        ],
      },
      summaryMessage: 'Preflight failed. Resolve errors and retry import.',
      totalItems: 0,
      maxAttempts: BASE_IMPORT_MAX_ATTEMPTS,
    });
  }

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
      normalizedParams.directTarget && ids.length === 1
        ? `Queued exact ${normalizedParams.directTarget.type === 'sku' ? 'SKU' : 'Base Product ID'} target ${normalizedParams.directTarget.value} for new product creation.`
        : ids.length === 0
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
  dispatchMode: run.dispatchMode ?? null,
  summaryMessage: run.summaryMessage ?? null,
});

export const updateBaseImportRunQueueJob = async (
  runId: string,
  queueJobId: string | null,
  dispatchMode?: 'queued' | 'inline' | null
): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw notFoundError('Base import run not found.', { runId });
  }
  const normalizedQueueJobId = queueJobId?.trim() || null;
  return updateBaseImportRun(runId, {
    queueJobId: normalizedQueueJobId,
    ...(dispatchMode != null ? { dispatchMode } : {}),
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
    Array.isArray(statuses) && statuses.length > 0 ? statuses : BASE_IMPORT_RESUME_DEFAULT_STATUSES;
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

  let processedItemsSinceHeartbeat = 0;
  let itemScanOffset = 0;
  let wrappedItemScan = false;

  try {
    let runTotal = run.stats?.total ?? 0;
    if (runTotal === 0) {
      const refreshed = await recomputeBaseImportRunStats(runId);
      runTotal = refreshed.stats?.total ?? 0;
      if (runTotal === 0) {
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
    }

    await updateBaseImportRunStatus(runId, 'running', {
      queueJobId: options?.jobId ?? run.queueJobId ?? null,
      summaryMessage: `Processing ${runTotal} product(s).`,
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
      targetCatalog.defaultPriceGroupId,
      {
        baseToken: connection.token,
        inventoryId: run.params.inventoryId,
      }
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
    const exactTargetImport = isExactTargetImport(run.params.directTarget);
    const templateMappings = Array.isArray(template?.mappings) ? template.mappings : [];
    const templateParameterImportSettings = normalizeBaseImportParameterImportSettings(
      template?.parameterImport
    );
    const lookups = await resolveProducerAndTagLookups(connection.connectionId);
    const productRepository = await getProductRepository();
    const parameterRepository = await getParameterRepository();
    const customFieldRepository = await getCustomFieldRepository();
    let customFieldDefinitions: ProductCustomFieldDefinition[] =
      await customFieldRepository.listCustomFields({});

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

      const nowMs = Date.now();
      const batch = await listDueBaseImportRunItemBatch({
        runId,
        allowedStatuses,
        nowMs,
        offset: itemScanOffset,
      });
      itemScanOffset = batch.nextOffset;
      const dueItems = batch.dueItems;
      if (dueItems.length === 0) {
        if (batch.reachedEnd && itemScanOffset > 0 && !wrappedItemScan) {
          itemScanOffset = 0;
          wrappedItemScan = true;
          continue;
        }
        const nextRetryAtMs = batch.nextRetryAtMs;
        if (nextRetryAtMs !== null) {
          const waitMs = nextRetryAtMs - nowMs;
          if (waitMs > 0 && waitMs <= BASE_IMPORT_RETRY_WAIT_WINDOW_MS) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            itemScanOffset = 0;
            wrappedItemScan = false;
            continue;
          }
        }
        break;
      }
      wrappedItemScan = false;

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
          pricingContext.preferredCurrencies,
          customFieldDefinitions
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
            customFieldDefinitions,
            lookups,
            templateMappings,
            productRepository,
            parameterRepository,
            imageMode: run.params.imageMode,
            dryRun: Boolean(run.params.dryRun),
            inventoryId: run.params.inventoryId,
            mode: resolveEffectiveMode(run.params),
            forceCreateNewProduct: exactTargetImport,
            persistBaseSyncIdentity: !exactTargetImport,
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
                ...(result.metadata ? { metadata: result.metadata } : {}),
                errorCode: result.errorCode ?? null,
                errorClass: result.errorClass ?? 'transient',
                errorMessage: result.errorMessage ?? 'Retry scheduled.',
                retryable: true,
                lastErrorAt: now,
                nextRetryAt: new Date(Date.now() + delayMs).toISOString(),
              },
              { recompute: false }
            );
          } else {
            await markRunItem(runId, item, result, { recompute: false });
          }
        } catch (error: unknown) {
          void ErrorSystem.captureException(error);
          const delayMs = computeRetryDelayMs(attempt);
          const isRetryable = attempt < maxAttempts;
          const status: BaseImportItemStatus = isRetryable ? 'pending' : 'failed';
          await markRunItem(
            runId,
            item,
            {
              status,
              action: status === 'pending' ? 'pending' : 'failed',
              errorCode: 'UNEXPECTED_ERROR',
              errorClass: isRetryable ? 'transient' : 'permanent',
              errorMessage: error instanceof Error ? error.message : String(error),
              retryable: isRetryable,
              lastErrorAt: now,
              nextRetryAt: isRetryable ? new Date(Date.now() + delayMs).toISOString() : null,
              finishedAt: isRetryable ? null : now,
            },
            { recompute: false }
          );
        }
      }
    }

    const finalStats = await recomputeBaseImportRunStats(runId);
    const hasPendingItems =
      (finalStats.stats?.pending ?? 0) > 0 || (finalStats.stats?.processing ?? 0) > 0;
    const terminalStatus = determineBaseImportTerminalStatus(finalStats.stats, {
      hasPendingItems,
    });
    const latestFailure =
      (finalStats.stats?.failed ?? 0) > 0 ? await findLatestFailedImportItem(runId) : null;
    const latestFailureSummary = formatLatestFailureSummary(latestFailure);
    const summaryMessageBase = buildSummaryMessage(finalStats.stats, Boolean(run.params.dryRun));
    const exactTargetItems =
      run.params.directTarget && (finalStats.stats?.total ?? 0) === 1
        ? await listBaseImportRunItems(runId, {
            limit: 1,
          })
        : [];
    const exactTargetSummary = formatExactTargetItemSummary({
      run,
      item: Array.isArray(exactTargetItems) ? (exactTargetItems[0] ?? null) : null,
    });
    return updateBaseImportRunStatus(runId, terminalStatus, {
      finishedAt: nowIso(),
      summaryMessage: exactTargetSummary
        ? exactTargetSummary
        : latestFailureSummary
          ? `${summaryMessageBase} ${latestFailureSummary}`
          : summaryMessageBase,
      error: latestFailure?.errorMessage ?? null,
      errorCode: latestFailure?.errorCode ?? null,
      errorClass: latestFailure?.errorClass ?? null,
    });
  } finally {
    await releaseBaseImportRunLease({ runId, ownerId });
  }
};
