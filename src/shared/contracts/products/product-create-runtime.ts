import type { ProductWithImages } from './product';

export type ProductCreateRuntimeStatusName = 'queued' | 'processing' | 'completed' | 'failed';

export type ProductCreateRuntimeQueuedResponse = {
  queued: true;
  requestId: string;
  status: 'queued';
  queuedAt: string;
  sku: string | null;
  message: string;
};

export type ProductCreateRuntimeStatusResponse = {
  requestId: string;
  status: ProductCreateRuntimeStatusName;
  queuedAt: string;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  sku: string | null;
  productId?: string | undefined;
  productSku?: string | undefined;
  errorMessage?: string | undefined;
};

export type ProductCreateMutationResult = ProductWithImages | ProductCreateRuntimeQueuedResponse;

export const isProductCreateRuntimeQueuedResponse = (
  value: unknown
): value is ProductCreateRuntimeQueuedResponse => {
  if (value === null || typeof value !== 'object') return false;
  const record = value as Partial<ProductCreateRuntimeQueuedResponse>;
  return record.queued === true && record.status === 'queued' && typeof record.requestId === 'string';
};
