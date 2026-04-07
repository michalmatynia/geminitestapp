import type { ProductJob } from '@/shared/contracts/integrations/domain';
import type { TraderaQueueHealthResponse } from '@/shared/contracts/jobs';
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
