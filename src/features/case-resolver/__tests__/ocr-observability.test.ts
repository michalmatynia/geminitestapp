import { describe, expect, it } from 'vitest';

import { buildCaseResolverOcrObservabilitySnapshot } from '@/features/case-resolver/server/ocr-observability';
import type { CaseResolverOcrJobRecord } from '@/features/case-resolver/server/ocr-runtime-job-store';

const buildJob = (input: Partial<CaseResolverOcrJobRecord>): CaseResolverOcrJobRecord => {
  const now = '2026-02-20T16:00:00.000Z';
  return {
    id: input.id ?? 'job-default',
    status: input.status ?? 'queued',
    filepath: input.filepath ?? '/uploads/case-resolver/images/default.png',
    model: input.model ?? 'openai:gpt-4o-mini',
    prompt: input.prompt ?? 'Extract text',
    retryOfJobId: input.retryOfJobId ?? null,
    correlationId: input.correlationId ?? null,
    dispatchMode: input.dispatchMode ?? 'queued',
    attemptsMade: input.attemptsMade ?? 0,
    maxAttempts: input.maxAttempts ?? 3,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    startedAt: input.startedAt ?? null,
    finishedAt: input.finishedAt ?? null,
    resultText: input.resultText ?? null,
    errorMessage: input.errorMessage ?? null,
    errorCategory: input.errorCategory ?? null,
    retryableError: input.retryableError ?? null,
  };
};

describe('case resolver OCR observability snapshot', () => {
  it('aggregates status, success rate, retry rate, and failure categories', () => {
    const jobs: CaseResolverOcrJobRecord[] = [
      buildJob({
        id: 'job-completed',
        status: 'completed',
        correlationId: 'corr-a',
        startedAt: '2026-02-20T15:59:55.000Z',
        finishedAt: '2026-02-20T16:00:00.000Z',
        resultText: 'text',
      }),
      buildJob({
        id: 'job-failed-retryable',
        status: 'failed',
        correlationId: 'corr-a',
        retryOfJobId: 'job-completed',
        errorCategory: 'timeout',
        retryableError: true,
      }),
      buildJob({
        id: 'job-failed-hard',
        status: 'failed',
        correlationId: 'corr-b',
        errorCategory: 'validation',
        retryableError: false,
      }),
      buildJob({
        id: 'job-running',
        status: 'running',
        correlationId: 'corr-c',
        createdAt: '2026-02-20T15:59:00.000Z',
      }),
    ];

    const snapshot = buildCaseResolverOcrObservabilitySnapshot(
      jobs,
      Date.parse('2026-02-20T16:00:00.000Z')
    );

    expect(snapshot.sampleSize).toBe(4);
    expect(snapshot.statuses).toEqual({
      queued: 0,
      running: 1,
      completed: 1,
      failed: 2,
    });
    expect(snapshot.successRate).toBe(1 / 3);
    expect(snapshot.retryRate).toBe(1 / 4);
    expect(snapshot.retryableFailureRate).toBe(1 / 2);
    expect(snapshot.failureCategories.timeout).toBe(1);
    expect(snapshot.failureCategories.validation).toBe(1);
    expect(snapshot.distinctCorrelationIds).toBe(3);
  });

  it('computes completion latency and backlog age percentiles', () => {
    const jobs: CaseResolverOcrJobRecord[] = [
      buildJob({
        id: 'job-completed-a',
        status: 'completed',
        startedAt: '2026-02-20T15:59:58.000Z',
        finishedAt: '2026-02-20T16:00:00.000Z',
      }),
      buildJob({
        id: 'job-completed-b',
        status: 'completed',
        startedAt: '2026-02-20T15:59:50.000Z',
        finishedAt: '2026-02-20T16:00:00.000Z',
      }),
      buildJob({
        id: 'job-queued',
        status: 'queued',
        createdAt: '2026-02-20T15:59:30.000Z',
      }),
      buildJob({
        id: 'job-running',
        status: 'running',
        createdAt: '2026-02-20T15:59:40.000Z',
      }),
    ];

    const snapshot = buildCaseResolverOcrObservabilitySnapshot(
      jobs,
      Date.parse('2026-02-20T16:00:00.000Z')
    );

    expect(snapshot.completionLatencyMs.count).toBe(2);
    expect(snapshot.completionLatencyMs.maxMs).toBe(10_000);
    expect(snapshot.backlogAgeMs.count).toBe(2);
    expect(snapshot.backlogAgeMs.maxMs).toBe(30_000);
  });
});
