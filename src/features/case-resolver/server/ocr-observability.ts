import 'server-only';

import type {
  CaseResolverOcrErrorCategory,
  CaseResolverOcrJobRecord,
  CaseResolverOcrObservabilitySnapshot,
  CaseResolverOcrPercentileSnapshot as PercentileSnapshot,
} from '@/shared/contracts/case-resolver';

import { listCaseResolverRecentOcrJobs } from './ocr-runtime-job-store';

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
};

const buildPercentileSnapshot = (values: number[]): PercentileSnapshot => {
  return {
    count: values.length,
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    maxMs: values.length > 0 ? Math.max(...values) : 0,
  };
};

const toTimestamp = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const buildCaseResolverOcrObservabilitySnapshot = (
  jobs: CaseResolverOcrJobRecord[],
  nowMs: number = Date.now()
): CaseResolverOcrObservabilitySnapshot => {
  const statuses: Record<CaseResolverOcrJobRecord['status'], number> = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
  };
  const failureCategories: Record<CaseResolverOcrErrorCategory, number> = {
    timeout: 0,
    rate_limit: 0,
    network: 0,
    provider: 0,
    validation: 0,
    unknown: 0,
  };
  const completionDurationsMs: number[] = [];
  const backlogAgesMs: number[] = [];
  let retryJobs = 0;
  let retryableFailures = 0;
  let totalFailures = 0;
  const correlations = new Set<string>();

  jobs.forEach((job: CaseResolverOcrJobRecord): void => {
    statuses[job.status] += 1;
    if (job.retryOfJobId) retryJobs += 1;
    if (job.correlationId) {
      correlations.add(job.correlationId);
    }

    if (job.status === 'failed') {
      totalFailures += 1;
      if (job.errorCategory) {
        failureCategories[job.errorCategory] += 1;
      } else {
        failureCategories.unknown += 1;
      }
      if (job.retryableError === true) {
        retryableFailures += 1;
      }
      return;
    }

    if (job.status === 'completed') {
      const startedAt = toTimestamp(job.startedAt);
      const finishedAt = toTimestamp(job.finishedAt);
      if (startedAt !== null && finishedAt !== null && finishedAt >= startedAt) {
        completionDurationsMs.push(finishedAt - startedAt);
      }
      return;
    }

    if (job.status === 'queued' || job.status === 'running') {
      const createdAt = toTimestamp(job.createdAt);
      if (createdAt !== null && nowMs >= createdAt) {
        backlogAgesMs.push(nowMs - createdAt);
      }
    }
  });

  const terminalCount = statuses.completed + statuses.failed;
  const successRate = terminalCount > 0 ? statuses.completed / terminalCount : 0;
  const retryRate = jobs.length > 0 ? retryJobs / jobs.length : 0;
  const retryableFailureRate = totalFailures > 0 ? retryableFailures / totalFailures : 0;

  return {
    generatedAt: new Date(nowMs).toISOString(),
    sampleSize: jobs.length,
    statuses,
    successRate,
    retryRate,
    retryableFailureRate,
    failureCategories,
    completionLatencyMs: buildPercentileSnapshot(completionDurationsMs),
    backlogAgeMs: buildPercentileSnapshot(backlogAgesMs),
    distinctCorrelationIds: correlations.size,
  };
};

export const getCaseResolverOcrObservabilitySnapshot = async (options?: {
  limit?: number;
}): Promise<CaseResolverOcrObservabilitySnapshot> => {
  const jobs = await listCaseResolverRecentOcrJobs(options?.limit);
  return buildCaseResolverOcrObservabilitySnapshot(jobs);
};
