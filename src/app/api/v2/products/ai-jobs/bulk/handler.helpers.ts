import type { BulkAiJobRequestDto, ProductAiJobType } from '@/shared/contracts/jobs';

export const BULK_PRODUCT_AI_JOB_LIST_QUERY = {
  pageSize: 10000,
  page: 1,
} as const;

export const buildBulkProductAiJobPayload = (
  config: BulkAiJobRequestDto['config']
): Record<string, unknown> => {
  if (!config) {
    return {};
  }

  return { ...(config as Record<string, unknown>) };
};

export const buildBulkProductAiJobEmptyResponse = (): {
  message: string;
  count: 0;
} => ({
  message: 'No products found to process',
  count: 0,
});

export const buildBulkProductAiJobQueuedResponse = (
  type: ProductAiJobType,
  count: number
): {
  success: true;
  count: number;
  message: string;
} => ({
  success: true,
  count,
  message: `Queued ${count} jobs of type ${type}`,
});
