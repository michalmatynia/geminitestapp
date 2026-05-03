import { api } from '@/shared/lib/api-client';

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
