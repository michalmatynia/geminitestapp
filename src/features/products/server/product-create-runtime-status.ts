import type {
  ProductCreateRuntimeQueuedResponse,
  ProductCreateRuntimeStatusResponse,
} from '@/shared/contracts/products';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const MAX_STATUS_AGE_MS = 60 * 60 * 1000;

const runtimeCreateStatusByRequestId = new Map<string, ProductCreateRuntimeStatusResponse>();

const nowIso = (): string => new Date().toISOString();

const cloneStatus = (
  status: ProductCreateRuntimeStatusResponse
): ProductCreateRuntimeStatusResponse => ({ ...status });

const pruneExpiredRuntimeCreateStatuses = (): void => {
  const cutoff = Date.now() - MAX_STATUS_AGE_MS;
  runtimeCreateStatusByRequestId.forEach((status, requestId) => {
    const timestamp = Date.parse(status.completedAt ?? status.queuedAt);
    if (Number.isFinite(timestamp) && timestamp < cutoff) {
      runtimeCreateStatusByRequestId.delete(requestId);
    }
  });
};

export const createQueuedProductCreateRuntimeStatus = ({
  requestId,
  sku,
}: {
  requestId: string;
  sku: string | null;
}): ProductCreateRuntimeQueuedResponse => {
  pruneExpiredRuntimeCreateStatuses();
  const queuedAt = nowIso();
  runtimeCreateStatusByRequestId.set(requestId, {
    requestId,
    status: 'queued',
    queuedAt,
    sku,
  });

  return {
    queued: true,
    requestId,
    status: 'queued',
    queuedAt,
    sku,
    message: 'Product creation queued in runtime.',
  };
};

export const markProductCreateRuntimeProcessing = (requestId: string): void => {
  const current = runtimeCreateStatusByRequestId.get(requestId);
  if (current === undefined) return;
  runtimeCreateStatusByRequestId.set(requestId, {
    ...current,
    status: 'processing',
    startedAt: current.startedAt ?? nowIso(),
  });
};

export const markProductCreateRuntimeCompleted = ({
  product,
  requestId,
}: {
  product: ProductWithImages | null | undefined;
  requestId: string;
}): void => {
  const current = runtimeCreateStatusByRequestId.get(requestId);
  if (current === undefined) return;
  runtimeCreateStatusByRequestId.set(requestId, {
    ...current,
    status: 'completed',
    completedAt: nowIso(),
    productId: typeof product?.id === 'string' ? product.id : undefined,
    productSku: typeof product?.sku === 'string' ? product.sku : undefined,
  });
};

export const markProductCreateRuntimeFailed = ({
  error,
  requestId,
}: {
  error: unknown;
  requestId: string;
}): void => {
  const current = runtimeCreateStatusByRequestId.get(requestId);
  if (current === undefined) return;
  runtimeCreateStatusByRequestId.set(requestId, {
    ...current,
    status: 'failed',
    completedAt: nowIso(),
    errorMessage: error instanceof Error ? error.message : 'Product creation failed.',
  });
};

export const getProductCreateRuntimeStatus = (
  requestId: string
): ProductCreateRuntimeStatusResponse | null => {
  pruneExpiredRuntimeCreateStatuses();
  const status = runtimeCreateStatusByRequestId.get(requestId);
  return status === undefined ? null : cloneStatus(status);
};

export const clearProductCreateRuntimeStatuses = (): void => {
  runtimeCreateStatusByRequestId.clear();
};
