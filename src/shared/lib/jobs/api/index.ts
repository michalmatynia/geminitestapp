import type { ProductJob } from '@/shared/contracts/integrations';
import type { ProductAiJob, TraderaQueueHealthResponse } from '@/shared/contracts/jobs';
import { api } from '@/shared/lib/api-client';

export type { TraderaQueueHealthResponse };

/**
 * Fetch integration jobs
 */
export async function getIntegrationJobs(): Promise<ProductJob[]> {
  return api.get<ProductJob[]>('/api/v2/integrations/jobs');
}

/**
 * Fetch product AI jobs with optional scope
 */
export async function getProductAiJobs(scope: string = 'all'): Promise<{ jobs: ProductAiJob[] }> {
  return api.get<{ jobs: ProductAiJob[] }>('/api/v2/products/ai-jobs', {
    params: { scope },
  });
}

/**
 * Fetch a single product AI job by ID
 */
export async function getProductAiJob(jobId: string): Promise<{ job: ProductAiJob }> {
  return api.get<{ job: ProductAiJob }>(`/api/v2/products/ai-jobs/${jobId}`);
}

/**
 * Perform action on product AI job
 */
export async function performProductAiJobAction(
  jobId: string,
  action: 'retry' | 'cancel'
): Promise<unknown> {
  return api.post<unknown>(`/api/v2/products/ai-jobs/${jobId}`, { action });
}

/**
 * Fetch chatbot jobs with optional scope
 */
export async function getChatbotJobs(scope: string = 'all'): Promise<{ jobs: unknown[] }> {
  return api.get<{ jobs: unknown[] }>('/api/chatbot/jobs', {
    params: { scope },
  });
}

/**
 * Update a product AI job status
 */
export async function updateProductAiJob(
  jobId: string,
  data: Partial<ProductAiJob>
): Promise<{ success: boolean; job: ProductAiJob }> {
  return api.put<{ success: boolean; job: ProductAiJob }>(
    `/api/v2/products/ai-jobs/${jobId}`,
    data
  );
}

/**
 * Delete a product AI job
 */
export async function deleteProductAiJob(jobId: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/api/v2/products/ai-jobs/${jobId}`);
}

/**
 * Clear product AI jobs by scope
 */
export async function clearProductAiJobs(
  scope: string = 'all'
): Promise<{ success: boolean; count: number }> {
  return api.delete<{ success: boolean; count: number }>('/api/v2/products/ai-jobs', {
    params: { scope },
  });
}

/**
 * Update a chatbot job
 */
export async function updateChatbotJob(
  jobId: string,
  action: 'retry' | 'cancel'
): Promise<unknown> {
  return api.post<unknown>(`/api/chatbot/jobs/${jobId}`, { action });
}

/**
 * Delete a chatbot job
 */
export async function deleteChatbotJob(jobId: string, force?: boolean): Promise<void> {
  const options: Parameters<typeof api.delete>[1] = {};
  if (force) options.params = { force: 'true' };
  await api.delete(`/api/chatbot/jobs/${jobId}`, options);
}

/**
 * Clear chatbot jobs by scope
 */
export async function clearChatbotJobs(
  scope: string = 'all'
): Promise<{ success: boolean; count: number }> {
  return api.delete<{ success: boolean; count: number }>('/api/chatbot/jobs', {
    params: { scope },
  });
}

/**
 * Cancel a listing
 */
export async function cancelListing(productId: string, listingId: string): Promise<void> {
  return api.delete(`/api/v2/integrations/products/${productId}/listings/${listingId}`);
}

/**
 * Fetch general job status
 */
export async function getJobStatus(): Promise<{ status: unknown }> {
  return api.get<{ status: unknown }>('/api/jobs/status');
}

/**
 * Fetch specific job status
 */
export async function getJobStatusDetail(jobId: string): Promise<{ status: unknown }> {
  return api.get<{ status: unknown }>(`/api/jobs/${jobId}/status`);
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(`/api/jobs/${jobId}/cancel`);
}

export async function getTraderaQueueHealth(): Promise<TraderaQueueHealthResponse> {
  return api.get<TraderaQueueHealthResponse>('/api/v2/integrations/queues/tradera');
}
