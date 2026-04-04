import { z } from 'zod';

import { badRequestError } from '@/shared/errors/app-error';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const listQuerySchema = z.object({
  status: optionalBooleanQuerySchema().default(false),
  productId: optionalTrimmedQueryString(),
});

export const deleteQuerySchema = z.object({
  scope: z.enum(['terminal', 'all']),
});

export type ProductAiJobsListQuery = z.infer<typeof listQuerySchema>;
export type ProductAiJobsDeleteQuery = z.infer<typeof deleteQuerySchema>;

export const isLegacySchemaMismatchError = (
  error: unknown
): error is { code: 'P2021' | 'P2022' } => {
  if (!error || typeof error !== 'object') return false;
  const { code } = error as { code?: unknown };
  return code === 'P2021' || code === 'P2022';
};

export const hasScheduledMarker = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  const keys = ['runAt', 'scheduledAt', 'scheduleAt', 'nextRunAt', 'schedule', 'scheduled', 'cron'];
  if (keys.some((key) => record[key])) return true;
  const context = record['context'];
  if (context && typeof context === 'object') {
    const ctx = context as Record<string, unknown>;
    if (keys.some((key) => ctx[key])) return true;
  }
  return false;
};

export const shouldStartProductAiJobsQueue = (
  jobs: Array<{ status?: unknown; payload?: unknown }>,
  queueStatus: { running?: boolean }
): boolean => {
  if (queueStatus.running) return false;

  const hasActiveJobs = jobs.some(
    (job) => job.status === 'pending' || job.status === 'running'
  );
  const hasScheduledJobs = jobs.some((job) => hasScheduledMarker(job.payload));
  return hasActiveJobs || hasScheduledJobs;
};

export const resolveProductAiJobsDeleteScope = (
  query: ProductAiJobsDeleteQuery | undefined
): 'terminal' | 'all' => {
  if (query?.scope === 'terminal' || query?.scope === 'all') {
    return query.scope;
  }
  throw badRequestError('Invalid scope');
};

export const buildProductAiJobsListResponse = <TJob>(jobs: TJob[]): { jobs: TJob[] } => ({ jobs });

export const buildProductAiJobsQueueStatusResponse = <TStatus>(
  status: TStatus
): { status: TStatus } => ({ status });

export const buildProductAiJobsClearResponse = (count: number): { success: true; count: number } => ({
  success: true,
  count,
});

export const buildEmptyProductAiJobsResponse = (): { jobs: [] } => ({ jobs: [] });
