import type {
  ProductAiJob,
  ProductAiJobActionResponse,
  ProductAiJobDeleteResponse,
  ProductAiJobResponse,
  ProductAiJobsClearResponse,
  ProductAiJobsResponse,
} from '@/shared/contracts/jobs';
import { api } from '@/shared/lib/api-client';

/**
 * Fetch product AI jobs with optional scope
 */
export async function getProductAiJobs(scope: string = 'all'): Promise<ProductAiJobsResponse> {
  return api.get<ProductAiJobsResponse>('/api/v2/products/ai-jobs', {
    params: { scope },
  });
}

/**
 * Fetch a single product AI job by ID
 */
export async function getProductAiJob(jobId: string): Promise<ProductAiJobResponse> {
  return api.get<ProductAiJobResponse>(`/api/v2/products/ai-jobs/${jobId}`);
}

/**
 * Perform action on product AI job
 */
export async function performProductAiJobAction(
  jobId: string,
  action: 'retry' | 'cancel'
): Promise<ProductAiJobActionResponse> {
  return api.post<ProductAiJobActionResponse>(`/api/v2/products/ai-jobs/${jobId}`, { action });
}

/**
 * Update a product AI job status
 */
export async function updateProductAiJob(
  jobId: string,
  data: Partial<ProductAiJob>
): Promise<ProductAiJobActionResponse> {
  return api.put<ProductAiJobActionResponse>(`/api/v2/products/ai-jobs/${jobId}`, data);
}

/**
 * Delete a product AI job
 */
export async function deleteProductAiJob(jobId: string): Promise<ProductAiJobDeleteResponse> {
  return api.delete<ProductAiJobDeleteResponse>(`/api/v2/products/ai-jobs/${jobId}`);
}

/**
 * Clear product AI jobs by scope
 */
export async function clearProductAiJobs(
  scope: string = 'all'
): Promise<ProductAiJobsClearResponse> {
  return api.delete<ProductAiJobsClearResponse>('/api/v2/products/ai-jobs', {
    params: { scope },
  });
}
