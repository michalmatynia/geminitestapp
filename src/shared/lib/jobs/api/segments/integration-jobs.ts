import type { ProductJob } from '@/shared/contracts/integrations/domain';
import type { BaseImportRunRecord, BaseImportRunsResponse } from '@/shared/contracts/integrations/base-com';
import type { BaseImportQueueHealthResponse, TraderaQueueHealthResponse } from '@/shared/contracts/jobs';
export type { BaseImportQueueHealthResponse, TraderaQueueHealthResponse };
import { api } from '@/shared/lib/api-client';

/**
 * Fetch integration jobs
 */
export async function getIntegrationJobs(signal?: AbortSignal): Promise<ProductJob[]> {
  return api.get<ProductJob[]>('/api/v2/integrations/jobs', signal ? { signal } : undefined);
}

/**
 * Cancel a listing
 */
export async function cancelListing(productId: string, listingId: string): Promise<void> {
  return api.delete(`/api/v2/integrations/products/${productId}/listings/${listingId}`);
}

export async function getTraderaQueueHealth(): Promise<TraderaQueueHealthResponse> {
  return api.get<TraderaQueueHealthResponse>('/api/v2/integrations/queues/tradera');
}

export async function getBaseImportQueueHealth(): Promise<BaseImportQueueHealthResponse> {
  return api.get<BaseImportQueueHealthResponse>('/api/v2/integrations/queues/base-import');
}

export async function getBaseImportRuns(
  limit: number = 100,
  signal?: AbortSignal
): Promise<BaseImportRunRecord[]> {
  const response = await api.get<BaseImportRunsResponse>('/api/v2/integrations/imports/base/runs', {
    params: { limit },
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });
  return response.runs;
}
