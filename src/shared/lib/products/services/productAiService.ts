import { getProductAiJobRepository } from './product-ai-job-repository';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { productService } from '@/features/products/server';
import type { ProductAiJobRecord, ProductAiJobUpdate } from '@/shared/contracts/jobs';
import type { ProductAiJobType, ProductAiJob, ProductAiJobResult } from '@/shared/contracts/jobs';
import { invalidStateError, notFoundError } from '@/shared/errors/app-error';

type ProductSummary = {
  name_en: string | null;
  sku: string | null;
};

const LOG_SOURCE = 'product-ai-service';

const parseEnvMs = (raw: string | undefined, fallbackMs: number, minMs: number): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed)) return fallbackMs;
  return Math.max(minMs, parsed);
};

const GRAPH_MODEL_REUSE_RUNNING_MAX_AGE_MS = parseEnvMs(
  process.env['AI_PATHS_GRAPH_MODEL_REUSE_RUNNING_MAX_AGE_MS'],
  20_000,
  0
);

const GRAPH_MODEL_REUSE_SCAN_LIMIT = parseEnvMs(
  process.env['AI_PATHS_GRAPH_MODEL_REUSE_SCAN_LIMIT'],
  30,
  1
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const toJobResult = (value: unknown): ProductAiJobResult | null => {
  if (value === null || value === undefined) return null;
  return isRecord(value) ? value : null;
};

const toIsoString = (value?: Date | null): string | null => {
  if (!value) return null;
  return value.toISOString();
};

const toProductAiJob = (record: ProductAiJobRecord): ProductAiJob => ({
  id: record.id,
  productId: record.productId,
  status: record.status === 'canceled' ? 'cancelled' : record.status,
  type: record.type,
  jobType: record.type as ProductAiJobType,
  payload: isRecord(record.payload) ? record.payload : undefined,
  result: toJobResult(record.result),
  errorMessage: record.errorMessage ?? null,
  error: record.errorMessage ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
  startedAt: toIsoString(record.startedAt),
  finishedAt: toIsoString(record.finishedAt),
  completedAt: toIsoString(record.finishedAt),
});

const toProductSummary = (product: Record<string, unknown> | null): ProductSummary | null => {
  if (!product) return null;
  const record = product;
  const name = typeof record['name_en'] === 'string' ? record['name_en'] : null;
  const sku = typeof record['sku'] === 'string' ? record['sku'] : null;
  return { name_en: name, sku };
};

const resolveGraphModelCacheKey = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const raw = (payload as Record<string, unknown>)['cacheKey'];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveGraphModelResultText = (result: unknown): string => {
  if (!result || typeof result !== 'object') return '';
  const value = (result as Record<string, unknown>)['result'];
  return typeof value === 'string' ? value.trim() : '';
};

const summarizeGraphModelPayload = (payload: unknown): Record<string, unknown> | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  const prompt = record['prompt'];
  const imageUrls = Array.isArray(record['imageUrls']) ? record['imageUrls'] : [];
  return {
    source: record['source'],
    modelId: record['modelId'],
    vision: record['vision'],
    promptLength: typeof prompt === 'string' ? prompt.length : null,
    imageCount: imageUrls.length,
    cacheKey: typeof record['cacheKey'] === 'string' ? record['cacheKey'].slice(0, 12) : null,
  };
};

const canReuseGraphModelJob = (job: ProductAiJobRecord, cacheKey: string): boolean => {
  if (job.type !== 'graph_model') return false;
  if (resolveGraphModelCacheKey(job.payload) !== cacheKey) return false;
  if (job.status === 'pending') return true;
  if (job.status === 'running') {
    if (GRAPH_MODEL_REUSE_RUNNING_MAX_AGE_MS <= 0) return false;
    if (!job.startedAt) return true;
    const startedAtMs = job.startedAt instanceof Date ? job.startedAt.getTime() : Number.NaN;
    if (!Number.isFinite(startedAtMs)) return true;
    return Date.now() - startedAtMs < GRAPH_MODEL_REUSE_RUNNING_MAX_AGE_MS;
  }
  if (job.status !== 'completed') return false;
  return resolveGraphModelResultText(job.result).length > 0;
};

export async function enqueueProductAiJob(
  productId: string,
  type: ProductAiJobType,
  payload: unknown
): Promise<ProductAiJob> {
  try {
    const { ErrorSystem } = await import('@/features/observability/server');
    void ErrorSystem.logInfo('[enqueueProductAiJob] Creating job', {
      service: 'product-ai-service',
      productId,
      context: {
        type,
        payloadSummary: type === 'graph_model' ? summarizeGraphModelPayload(payload) : undefined,
      },
    });
  } catch {
    // Fallback to console if logging fails
    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Creating job',
      context: { productId, type },
    });
  }
  const jobRepository = await getProductAiJobRepository();

  if (type === 'graph_model') {
    const cacheKey = resolveGraphModelCacheKey(payload);
    if (cacheKey) {
      const existingJobs = await jobRepository.findJobs(productId, {
        type: 'graph_model',
        statuses: ['pending', 'running', 'completed'],
        limit: GRAPH_MODEL_REUSE_SCAN_LIMIT,
      });
      const reusable = existingJobs.find((job: ProductAiJobRecord) =>
        canReuseGraphModelJob(job, cacheKey)
      );
      if (reusable) {
        try {
          const { ErrorSystem } = await import('@/features/observability/server');
          void ErrorSystem.logInfo('[enqueueProductAiJob] Reusing graph_model job by cache key', {
            service: 'product-ai-service',
            productId,
            jobId: reusable.id,
            context: { type, cacheKey, status: reusable.status },
          });
        } catch {
          void logSystemEvent({
            level: 'info',
            source: LOG_SOURCE,
            message: 'Reusing graph_model job',
            context: { jobId: reusable.id, status: reusable.status, cacheKey },
          });
        }
        return toProductAiJob(reusable);
      }
    }
  }

  const jobRecord = await jobRepository.createJob(productId, type, payload);

  try {
    const { ErrorSystem } = await import('@/features/observability/server');
    void ErrorSystem.logInfo('[enqueueProductAiJob] Job created', {
      service: 'product-ai-service',
      productId,
      jobId: jobRecord.id,
      context: { type },
    });
  } catch {
    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Job created',
      context: { jobId: jobRecord.id, productId, type },
    });
  }

  return toProductAiJob(jobRecord);
}

export async function getProductAiJobs(
  productId?: string
): Promise<Array<Omit<ProductAiJob, 'product'> & { product: ProductSummary | null }>> {
  const jobRepository = await getProductAiJobRepository();
  const jobRecords = await jobRepository.findJobs(productId);
  const jobs = jobRecords.map(toProductAiJob);

  const shouldFetchProduct = (job: ProductAiJob): boolean => {
    if (!job.productId) return false;
    const payload =
      job.payload && typeof job.payload === 'object'
        ? (job.payload as Record<string, unknown>)
        : null;
    const entityType =
      (payload?.['entityType'] as string | undefined) ??
      ((payload?.['context'] as Record<string, unknown> | undefined)?.['entityType'] as
        | string
        | undefined);
    const source = payload?.['source'] as string | undefined;
    const graph = payload?.['graph'] as Record<string, unknown> | undefined;
    if (entityType && entityType !== 'product') return false;
    if (source === 'ai_paths' && graph) return false;
    if (job.productId.startsWith('path_')) return false;
    return true;
  };

  // Batch fetch products - deduplicate IDs to avoid redundant queries
  const uniqueProductIds = [
    ...new Set(jobs.filter(shouldFetchProduct).map((j: ProductAiJob) => j.productId)),
  ].filter((id): id is string => typeof id === 'string');

  // Fetch all unique products in parallel
  const productResults = await Promise.all(
    uniqueProductIds.map(
      async (id: string): Promise<{ id: string; product: Record<string, unknown> | null }> => {
        try {
          const product = await productService.getProductById(id);
          return { id, product: isRecord(product) ? product : null };
        } catch (error: unknown) {
          try {
            const { logSystemError } = await import('@/features/observability/server');
            await logSystemError({
              message: '[product-ai-service] Failed to fetch product in getProductAiJobs',
              error,
              source: 'product-ai-service',
              context: { action: 'getProductAiJobs', productId: id },
            });
          } catch (logError) {
            void logSystemEvent({
              level: 'error',
              source: LOG_SOURCE,
              message: 'Failed to fetch product in getProductAiJobs',
              error,
              context: { productId: id, logError },
            });
          }
          return { id, product: null };
        }
      }
    )
  );

  // Create lookup map for O(1) access
  const productMap = new Map(
    productResults.map(
      ({ id, product }: { id: string; product: Record<string, unknown> | null }) => [
        id,
        toProductSummary(product),
      ]
    )
  );

  // Enrich jobs with product data from map
  return jobs.map((job: ProductAiJob) => ({
    ...job,
    product: job.productId ? (productMap.get(job.productId) ?? null) : null,
  }));
}

export async function getProductAiJob(
  jobId: string
): Promise<(Omit<ProductAiJob, 'product'> & { product: Record<string, unknown> | null }) | null> {
  const jobRepository = await getProductAiJobRepository();
  const jobRecord = await jobRepository.findJobById(jobId);
  if (!jobRecord) return null;
  const job = toProductAiJob(jobRecord);

  let product: Record<string, unknown> | null = null;
  const payload =
    job.payload && typeof job.payload === 'object'
      ? (job.payload as Record<string, unknown>)
      : null;
  const entityType =
    (payload?.['entityType'] as string | undefined) ??
    ((payload?.['context'] as Record<string, unknown> | undefined)?.['entityType'] as
      | string
      | undefined);
  const source = payload?.['source'] as string | undefined;
  const graph = payload?.['graph'] as Record<string, unknown> | undefined;
  const shouldFetch =
    !!job.productId &&
    !job.productId.startsWith('path_') &&
    entityType !== 'note' &&
    entityType !== 'user' &&
    entityType !== 'system' &&
    !(source === 'ai_paths' && graph) &&
    (entityType ? entityType === 'product' : true);
  if (shouldFetch && job.productId) {
    try {
      const result = await productService.getProductById(job.productId);
      product = isRecord(result) ? result : null;
    } catch (error: unknown) {
      try {
        const { logSystemError } = await import('@/features/observability/server');
        await logSystemError({
          message: '[product-ai-service] Failed to fetch product in getProductAiJob',
          error,
          source: 'product-ai-service',
          context: { action: 'getProductAiJob', productId: job.productId, jobId: job.id },
        });
      } catch (logError) {
        void logSystemEvent({
          level: 'error',
          source: LOG_SOURCE,
          message: 'Failed to fetch product in getProductAiJob',
          error,
          context: { productId: job.productId, jobId: job.id, logError },
        });
      } // Continue without product details if it fails
    }
  }

  return {
    ...job,
    product,
  };
}

export async function updateProductAiJob(
  jobId: string,
  data: ProductAiJobUpdate
): Promise<ProductAiJob> {
  const jobRepository = await getProductAiJobRepository();
  const updated = await jobRepository.updateJob(jobId, data);
  return toProductAiJob(updated);
}

export async function cancelProductAiJob(jobId: string): Promise<ProductAiJob> {
  const jobRepository = await getProductAiJobRepository();
  const jobRecord = await jobRepository.findJobById(jobId);
  if (!jobRecord) throw notFoundError('Job not found', { jobId });
  if (jobRecord.status !== 'pending' && jobRecord.status !== 'running') {
    throw invalidStateError('Only pending or running jobs can be canceled', {
      jobId,
      status: jobRecord.status,
    });
  }

  const updated = await jobRepository.updateJob(jobId, {
    status: 'canceled',
    finishedAt: new Date(),
  });
  return toProductAiJob(updated);
}

export async function deleteProductAiJob(jobId: string): Promise<void> {
  const jobRepository = await getProductAiJobRepository();
  await jobRepository.deleteJob(jobId);
}

export async function deleteTerminalProductAiJobs(): Promise<number> {
  const jobRepository = await getProductAiJobRepository();
  const { count } = await jobRepository.deleteTerminalJobs();
  return count;
}

export async function deleteAllProductAiJobs(): Promise<number> {
  const jobRepository = await getProductAiJobRepository();
  const { count } = await jobRepository.deleteAllJobs();
  return count;
}

export async function cleanupStaleRunningProductAiJobs(maxAgeMs: number): Promise<number> {
  const jobRepository = await getProductAiJobRepository();
  const { count } = await jobRepository.markStaleRunningJobs(maxAgeMs);
  return count;
}
