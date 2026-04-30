import 'server-only';

import {
  readPlaywrightEngineRun,
  type ResolvedPlaywrightConnectionRuntime,
} from '@/features/playwright/server';
import {
  get1688DefaultConnectionId,
  getIntegrationRepository,
} from '@/features/integrations/server';
import type {
  IntegrationConnectionRecord,
  IntegrationRepository,
} from '@/shared/contracts/integrations/repositories';
import { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import {
  isProductScanActiveStatus,
  type ProductScanBatchItem,
  type ProductScanBatchResponse,
} from '@/shared/contracts/product-scans';
import type { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  getProductScanProviderDefinition,
  requireProductScanNativeRuntime,
  type ProductScanProviderRuntime,
} from './product-scan-providers';
import { getProductScannerSettings } from './product-scanner-settings';
import {
  findLatestActiveProductScan,
} from './product-scans-repository';
import {
  readOptionalString,
  resolveScanEngineRunId,
  toRecord,
  tryDirectQueuedScanUpdate,
} from './product-scans-service.helpers';
import type { sanitizeProductScanImageCandidates } from './product-scans-service.helpers';

export type BatchScanProvider = 'amazon' | '1688';

export type BatchScanQueueConfig = {
  provider: BatchScanProvider;
  runtime: ProductScanProviderRuntime;
  actionPrefix: string;
  alreadyRunningMessage: string;
  resultStatusLabel: string;
};

export type QueueBatchProductScansInput = {
  productIds: string[];
  config: BatchScanQueueConfig;
  forceVisible?: boolean;
  requestInput?: Record<string, unknown>;
  ownerUserId?: string | null;
};

export type ProductScannerSettings = ReturnType<typeof createDefaultProductScannerSettings>;
export type QueuedProductRecord = NonNullable<Awaited<ReturnType<typeof productService.getProductById>>>;
export type ProductScanImageCandidates = Awaited<ReturnType<typeof sanitizeProductScanImageCandidates>>;

export type SupplierConnectionContext = {
  integrationId: string;
  connection: IntegrationConnectionRecord;
} | null;

export type StartedQueuedScanRun = {
  actionId: string | null;
  allowManualVerification: boolean;
  imageSearchPageUrl: string | null;
  imageSearchProvider: string;
  manualVerificationTimeoutMs: number;
  recordDiagnostics: boolean;
  run: unknown;
  runtimeKey: string | null;
  selectorProfile: string | null;
};

type LatestActiveProductScan = NonNullable<Awaited<ReturnType<typeof findLatestActiveProductScan>>>;

export const AMAZON_QUEUE_CONFIG: BatchScanQueueConfig = {
  provider: 'amazon',
  runtime: requireProductScanNativeRuntime(AMAZON_PRODUCT_SCAN_PROVIDER),
  actionPrefix: 'queueAmazonBatchProductScans',
  alreadyRunningMessage: 'Amazon candidate search is already running for this product.',
  resultStatusLabel: 'Amazon candidate search queued',
};

export const SUPPLIER_1688_QUEUE_CONFIG: BatchScanQueueConfig = {
  provider: '1688',
  runtime: requireProductScanNativeRuntime(getProductScanProviderDefinition('1688')),
  actionPrefix: 'queue1688BatchProductScans',
  alreadyRunningMessage: '1688 supplier scan is already running for this product.',
  resultStatusLabel: '1688 supplier scan queued',
};

export const AMAZON_RUNTIME_KEY_DEFAULTED_FLAG = 'amazonRuntimeKeyDefaulted';

export const resolveQueuedProductName = (product: {
  name?: unknown;
  name_pl?: unknown;
  name_en?: unknown;
}): string => {
  const localizedRecord = toRecord(product.name);
  return (
    readOptionalString(localizedRecord?.['pl'], 500) ??
    readOptionalString(localizedRecord?.['en'], 500) ??
    readOptionalString(product.name_pl, 500) ??
    readOptionalString(product.name_en, 500) ??
    ''
  );
};

const resolveAlreadyRunningMessage = (
  provider: BatchScanProvider,
  currentStatus: ProductScanBatchItem['currentStatus']
): string => {
  if (provider === '1688') {
    return currentStatus === 'running'
      ? '1688 supplier scan running.'
      : '1688 supplier scan already in progress for this product.';
  }
  return currentStatus === 'running'
    ? 'Amazon candidate search running.'
    : 'Amazon candidate search already in progress for this product.';
};

const resolveActiveScanRunState = async (
  latestScan: LatestActiveProductScan
): Promise<{ currentStatus: ProductScanBatchItem['currentStatus']; runId: string | null }> => {
  const runId = resolveScanEngineRunId(latestScan);
  if (runId === null) return { currentStatus: latestScan.status, runId };

  try {
    const run = await readPlaywrightEngineRun(runId);
    if (run === null || (run.status !== 'queued' && run.status !== 'running')) {
      return { currentStatus: latestScan.status, runId };
    }
    if (latestScan.status !== run.status) {
      await tryDirectQueuedScanUpdate(latestScan, {
        engineRunId: run.runId,
        status: run.status,
        error: null,
        asinUpdateStatus: 'pending',
        asinUpdateMessage: null,
        completedAt: null,
      });
    }
    return { currentStatus: run.status, runId };
  } catch {
    return { currentStatus: latestScan.status, runId };
  }
};

export async function resolveAlreadyRunningBatchResult(input: {
  productId: string;
  provider: BatchScanProvider;
}): Promise<ProductScanBatchItem | null> {
  const latestScan = await findLatestActiveProductScan({
    productId: input.productId,
    provider: input.provider,
  });
  if (latestScan === null || isProductScanActiveStatus(latestScan.status) !== true) return null;

  const { currentStatus, runId } = await resolveActiveScanRunState(latestScan);
  return {
    productId: input.productId,
    scanId: latestScan.id,
    runId,
    status: 'already_running',
    currentStatus,
    message: resolveAlreadyRunningMessage(input.provider, currentStatus),
  };
}

export async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += limit) {
    batches.push(items.slice(index, index + limit));
  }

  return batches.reduce<Promise<R[]>>(async (previous, batch, batchIndex) => {
    const previousResults = await previous;
    const batchResults = await Promise.all(
      batch.map((item, index) => fn(item, batchIndex * limit + index))
    );
    return [...previousResults, ...batchResults];
  }, Promise.resolve([]));
}

export const resolveConnectionByIdCompat = async (input: {
  connectionId: string;
  repository: IntegrationRepository;
}): Promise<IntegrationConnectionRecord | null> => {
  if (typeof input.repository.getConnectionById === 'function') {
    return input.repository.getConnectionById(input.connectionId);
  }
  if (typeof input.repository.listConnections === 'function') {
    const connections = await input.repository.listConnections('');
    return Array.isArray(connections)
      ? connections.find((connection) => connection.id === input.connectionId) ?? null
      : null;
  }
  return null;
};

export const loadProductScannerSettings = async (
  actionPrefix: string
): Promise<ProductScannerSettings> => {
  const fallbackSettings = createDefaultProductScannerSettings();
  try {
    return await getProductScannerSettings();
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: `${actionPrefix}.loadScannerSettings`,
    });
    return fallbackSettings;
  }
};

const resolve1688ConnectionId = async (
  requestedConnectionId: string | null
): Promise<string | null> =>
  requestedConnectionId ?? get1688DefaultConnectionId();

export const resolveSupplierConnectionContext = async (input: {
  config: BatchScanQueueConfig;
  requestInput: Record<string, unknown>;
}): Promise<SupplierConnectionContext> => {
  if (input.config.provider !== '1688') return null;

  try {
    const requestedConnectionId = readOptionalString(input.requestInput['connectionId'], 160);
    const connectionId = await resolve1688ConnectionId(requestedConnectionId);
    if (connectionId === null || connectionId.length === 0) return null;

    const repository = await Promise.resolve(getIntegrationRepository());
    const connection = await resolveConnectionByIdCompat({ connectionId, repository });
    return connection === null
      ? null
      : { integrationId: connection.integrationId, connection };
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: `${input.config.actionPrefix}.resolve1688Connection`,
    });
    return null;
  }
};

export const resolveStartedRun = (
  value: unknown
): {
  runId: string;
  status: 'queued' | 'running';
} | null => {
  const record = toRecord(value);
  const runRecord = toRecord(record?.['run']) ?? record;
  const runId = readStartedRunId(runRecord);
  const status = readStartedRunStatus(runRecord);
  if (runId === null || status === null) return null;
  return { runId, status };
};

const readStartedRunId = (record: Record<string, unknown> | null): string | null => {
  const runId = record?.['runId'];
  return typeof runId === 'string' ? runId : null;
};

const readStartedRunStatus = (
  record: Record<string, unknown> | null
): 'queued' | 'running' | null => {
  const status = record?.['status'];
  if (status === 'running') return 'running';
  if (status === 'queued') return 'queued';
  return null;
};

export const summarizeBatchResults = (
  results: ProductScanBatchItem[]
): ProductScanBatchResponse => ({
  queued: results.filter((result) => result.status === 'queued').length,
  running: results.filter((result) => result.status === 'running').length,
  alreadyRunning: results.filter((result) => result.status === 'already_running').length,
  failed: results.filter((result) => result.status === 'failed').length,
  results,
});

export type { ResolvedPlaywrightConnectionRuntime };
