import type { ProductStudioRunStatus } from './ProductStudioContext.types';

export const STUDIO_PROJECT_NOT_CONNECTED = '__product_studio_not_connected__';

const PRODUCT_STUDIO_RUN_STATUSES: readonly ProductStudioRunStatus[] = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
];

export const isProductStudioRunStatus = (value: unknown): value is ProductStudioRunStatus =>
  typeof value === 'string' &&
  PRODUCT_STUDIO_RUN_STATUSES.includes(value as ProductStudioRunStatus);
